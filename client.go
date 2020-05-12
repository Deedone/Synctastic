package main

import (
	"fmt"

	"github.com/gorilla/websocket"
)

type Client struct {
	name    string
	ws      *websocket.Conn
	c       chan string
	wschan  chan string
	bhandle chan string
}

func fromWS(ws *websocket.Conn) *Client {
	c := Client{
		ws:     ws,
		c:      make(chan string),
		wschan: make(chan string),
	}

	go c.listen()
	return &c
}

func (c *Client) listen() {
	signal := make(chan bool)

	defer func() {
		c.ws.Close()
		close(c.wschan)
		signal <- true
		close(signal)
	}()

	go func() {
		for {
			typ, msg, err := c.ws.ReadMessage()
			if err != nil {
				fmt.Println("Socket error ", err)
			}

			switch typ {
			case websocket.TextMessage:
				strmsg := string(msg)
				fmt.Println("Got text msg", strmsg)
				c.wschan <- strmsg

			case websocket.CloseMessage:
				fmt.Println("Closing socket due to close message")
				return
			}

			select {
			case <-signal:
				fmt.Println("Got signal returning")
				return
			default:
				continue
			}
		}
	}()

	for {
		select {
		case msg := <-c.wschan:
			c.bhandle <- msg
		case msg := <-c.c:
			w, err := c.ws.NextWriter(websocket.TextMessage)
			if err != nil {
				fmt.Println("Writer error", err)
				return
			}
			w.Write([]byte(msg))

		}
	}

}
