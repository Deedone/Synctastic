package main

import (
	"encoding/json"
	"fmt"
	"sync"
)

type Room struct {
	clients       map[*Client]bool
	clientsGuard  sync.Mutex
	broadcastChan chan string
	vidTitle      string
	id            int
	lastUserId    int
	curVideoMsg   string
}

type RoomInfo struct {
	ID         int      `json:"id"`
	NumClients int      `json:"numClients"`
	Clients    []string `json:"clients"`
}

func newRoom(id int) *Room {
	return &Room{
		broadcastChan: make(chan string),
		clients:       make(map[*Client]bool),
		id:            id,
		lastUserId:    1,
	}
}

func (r *Room) reg(c *Client) {
	r.clientsGuard.Lock()
	r.clients[c] = true
	fmt.Println(r.id, "Registering", c)
	r.clientsGuard.Unlock()
	c.id = r.lastUserId
	r.lastUserId++
	r.sendInfo()
}

func (r *Room) unreg(c *Client) {
	r.clientsGuard.Lock()
	fmt.Println(r.id, "Dropping client", c)
	if _, ok := r.clients[c]; ok {
		delete(r.clients, c)
	}

	if c.host {
		var c2 *Client = nil
		for c2 = range r.clients {
			break
		}

		if c2 != nil {
			c2.forcehost()
		}
	}
	r.clientsGuard.Unlock()
	r.sendInfo()
}

func (r *Room) broadcast(msg string, nohost bool) {
	r.clientsGuard.Lock()
	for client := range r.clients {
		if client.host && nohost {
			continue
		}
		select {
		case client.roomin <- msg:
		default:
			fmt.Println(r.id, "Dropping client", client)
			delete(r.clients, client)
		}
	}
	r.clientsGuard.Unlock()
}

func (r *Room) run() {
	fmt.Println(r.id, "Room is running")
	for {
		select {
		case msg := <-r.broadcastChan:
			r.broadcast(msg, true)
		}
	}
}

func (r *Room) broadcastIds() {
	for c := range r.clients {
		msg := Message{
			Cmd:    "myId",
			IntArg: float64(c.id),
		}
		strmsg, err := json.Marshal(msg)
		if err != nil {
			fmt.Println("Error jsoning", msg, err)
			continue
		}
		c.roomin <- string(strmsg)
	}
}

func (r *Room) sendInfo() {
	info, err := json.Marshal(r)
	if err != nil {
		fmt.Println("Error jsoning room", err)
		return
	}
	m := Message{
		Cmd:    "roomInfo",
		StrArg: string(info),
	}
	msg, _ := json.Marshal(m)
	r.broadcast(string(msg), false)
	if len(r.curVideoMsg) > 0 {
		r.broadcast(r.curVideoMsg, true)
	}
	r.broadcastIds()
}

func (r *Room) changeVideo(msg string) {
	r.curVideoMsg = msg
	if len(r.curVideoMsg) > 0 {
		r.broadcast(r.curVideoMsg, true)
	}
}

func (r *Room) MarshalJSON() ([]byte, error) {
	ri := RoomInfo{
		ID:         r.id,
		NumClients: len(r.clients),
		Clients:    make([]string, 0),
	}
	for c := range r.clients {
		clientInfo := make(map[string]interface{})
		clientInfo["name"] = c.name
		clientInfo["id"] = c.id
		clientInfo["host"] = c.host
		msgInfo, _ := json.Marshal(clientInfo)

		ri.Clients = append(ri.Clients, string(msgInfo))
	}

	return json.Marshal(ri)

}
