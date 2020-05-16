package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	name     string
	host     bool
	hadPong  bool
	ws       *websocket.Conn
	room     *Room
	roomin   chan string
	wsin     chan string
	wsout    chan string
	control  chan bool
	watchdog *time.Timer
}

type Message struct {
	Cmd    string
	IntArg float64
	StrArg string
}

func fromWS(ws *websocket.Conn) *Client {
	c := Client{
		ws:       ws,
		host:     false,
		room:     nil,
		roomin:   make(chan string, 10),
		wsin:     make(chan string, 10),
		wsout:    make(chan string),
		control:  make(chan bool, 10),
		watchdog: time.NewTimer(time.Second),
		hadPong:  true,
	}

	go c.wsWrite()
	go c.wsRead()
	go c.process()
	return &c
}

func (c *Client) handleMsg(msg string) {
	var m Message
	err := json.Unmarshal([]byte(msg), &m)
	if err != nil {
		fmt.Println(c.ws.RemoteAddr(), "Error parsing json", msg, err)
		return
	}

	fmt.Println("Got msg", msg)
	fmt.Println("Got msg", m)
	switch m.Cmd {
	case "setName":
		c.name = m.StrArg
	case "setHost":
		c.host = m.IntArg == 1
	case "broadcast":
		if c.host && c.room != nil {
			c.room.broadcast <- msg
		}
	case "pong":
		c.hadPong = true

	default:
		fmt.Println("Unkniown command", m.Cmd)
	}
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
			c.wsout <- "{\"Cmd\":\"ping\"}"
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
			fmt.Println("Sending message", msg)
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

func (c *Client) enterRoom(r *Room) {
	c.room = r
	r.reg <- c
}

func (c *Client) kill() {
	for i := 0; i < 10; i++ {
		// Stop all routines
		c.control <- true
	}
	if c.room != nil {
		c.room.unreg <- c
	}
	close(c.roomin)
	close(c.wsin)
	close(c.wsout)
}
