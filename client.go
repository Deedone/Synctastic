package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	name     string
	id       int
	host     bool
	hadPong  bool
	ws       *websocket.Conn
	room     *Room
	lobby    *Lobby
	roomin   chan string
	wsin     chan string
	wsout    chan string
	control  chan bool
	watchdog *time.Timer
}

type Message struct {
	Cmd    string  `json:"cmd"`
	IntArg float64 `json:"intArg"`
	StrArg string  `json:"strArg"`
}

type RejoinCmd struct {
	Room int  `json:"room"`
	Host bool `json:"host"`
}

func fromWS(ws *websocket.Conn) *Client {
	c := Client{
		ws:       ws,
		host:     false,
		room:     nil,
		lobby:    nil,
		roomin:   make(chan string, 10),
		wsin:     make(chan string, 10),
		wsout:    make(chan string),
		control:  make(chan bool, 10),
		watchdog: time.NewTimer(time.Second),
		hadPong:  true,
		name:     "Client",
	}

	go c.wsWrite()
	go c.wsRead()
	go c.process()
	return &c
}

func (c *Client) kick() {
	var m Message
	m.Cmd = "kick"
	mstr, _ := json.Marshal(m)
	c.wsout <- string(mstr)
	//Self destruct
	go func() {
		time.Sleep(2)
		c.kill()
	}()
}

func (c *Client) handleMsg(msg string) {
	var m Message
	err := json.Unmarshal([]byte(msg), &m)
	if err != nil {
		fmt.Println(c.ws.RemoteAddr(), "Error parsing json", msg, err)
		return
	}

	switch m.Cmd {
	case "setName":
		c.name = m.StrArg
	case "setHost":
		c.host = m.IntArg == 1
		c.room.sendInfo()
	case "createRoom":
		r := c.lobby.createRoom()
		c.enterRoom(r)
	case "joinRoom":
		res := c.lobby.joinRoom(int(m.IntArg), c)
		if !res {
			fmt.Println("Joining failed")
			var m Message
			m.Cmd = "badId"
			mstr, _ := json.Marshal(m)
			c.wsout <- string(mstr)

		}
	case "broadcast":
		if c.host && c.room != nil {
			c.room.broadcastChan <- msg
		}
	case "selectVideo":
		if c.host && c.room != nil {
			c.room.changeVideo(msg)
		}
	case "transferHost":
		if !c.host || c.room == nil {
			return
		}
		c.host = false
		c.room.setHost(int(m.IntArg))
	case "pong":
		c.hadPong = true
	case "rejoin":
		var r RejoinCmd
		err := json.Unmarshal([]byte(m.StrArg), &r)
		if err != nil {
			fmt.Println("Error parsing rejoin cmd")
			return
		}
		res := c.lobby.joinRoom(r.Room, c)
		if !res {
			fmt.Println("Error rejoining room is dead")
			return
		}
		if r.Host {
			c.room.clearHosts()
			c.room.setHost(c.id)
		}
		fmt.Println("Reconnected")

	default:
		fmt.Println("Unkniown command", m.Cmd)
	}
}

func (c *Client) forcehost() {
	c.host = true

	var m Message
	m.Cmd = "youAreHost"
	mstr, _ := json.Marshal(m)
	c.wsout <- string(mstr)

}

func (c *Client) process() {
	for {
		select {
		case msg := <-c.roomin:
			c.wsout <- msg
		case msg := <-c.wsin:
			c.handleMsg(msg)
		case <-c.watchdog.C:
			if !c.hadPong {
				fmt.Println(c.ws.RemoteAddr(), "Bad client no pong, killing")
				c.kill()
				return
			}
			c.hadPong = false
			var m Message
			m.Cmd = "ping"
			mstr, _ := json.Marshal(m)
			c.wsout <- string(mstr)
			c.watchdog.Reset(time.Second * 10)

		case <-c.control:
			fmt.Println("Process got control, exiting")
			return
		}
	}
}

func (c *Client) wsWrite() {
	for {
		select {
		case msg := <-c.wsout:
			err := c.ws.WriteMessage(websocket.TextMessage, []byte(msg))
			if err != nil {
				fmt.Println(c.ws.RemoteAddr(), "Error writing, exiting")
				c.kill()
				return
			}
		case <-c.control:
			fmt.Println("WsWrite got control, exiting")
			return
		}
	}
}

func (c *Client) wsRead() {
	for {
		mt, msg, err := c.ws.ReadMessage()
		if err != nil {
			fmt.Println(c.ws.RemoteAddr(), "Socket error, shutting down", err)
			c.kill()
			return
		}
		if mt != websocket.TextMessage {
			continue
		}

		select {
		case <-c.control:
			fmt.Println("WsRead got control, exiting")
			return
		default:
		}
		c.wsin <- string(msg)
	}
}

func (c *Client) enterLobby(l *Lobby) {
	c.lobby = l
}

func (c *Client) enterRoom(r *Room) {
	c.exitRoom() //If we currently in some other room, exit it first
	c.room = r
	r.reg(c)
}

func (c *Client) exitRoom() {
	if c.room != nil {
		c.room.unreg(c)
		c.room = nil

	}
}

func (c *Client) kill() {
	if c.room != nil {
		c.room.unreg(c)
	}
	for i := 0; i < 10; i++ {
		// Stop all routines
		c.control <- true
	}
	close(c.roomin)
	close(c.wsin)
	close(c.wsout)
}
