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
	}
}

func (r *Room) reg(c *Client) {
	r.clientsGuard.Lock()
	r.clients[c] = true
	fmt.Println(r.id, "Registering", c)
	r.clientsGuard.Unlock()
	r.sendInfo()
}

func (r *Room) unreg(c *Client) {
	r.clientsGuard.Lock()
	fmt.Println(r.id, "Dropping client", c)
	if _, ok := r.clients[c]; ok {
		delete(r.clients, c)
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
}

func (r *Room) MarshalJSON() ([]byte, error) {
	ri := RoomInfo{
		ID:         r.id,
		NumClients: len(r.clients),
		Clients:    make([]string, 0),
	}
	for c := range r.clients {
		ri.Clients = append(ri.Clients, c.name)
	}

	return json.Marshal(ri)

}
