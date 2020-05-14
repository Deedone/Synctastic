package main

import "fmt"

type Room struct {
	clients   map[*Client]bool
	host      *Client
	broadcast chan string
	reg       chan *Client
	unreg     chan *Client
	vidTitle  string
}

func newRoom() *Room {
	return &Room{
		broadcast: make(chan string),
		reg:       make(chan *Client),
		unreg:     make(chan *Client),
		clients:   make(map[*Client]bool),
	}
}

func (r *Room) run() {
	fmt.Println("Room is running")
	for {
		select {
		case client := <-r.reg:
			r.clients[client] = true
			fmt.Println("Registering", client)
		case client := <-r.unreg:
			fmt.Println("Dropping client", client)
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
			}
		case msg := <-r.broadcast:
			for client := range r.clients {
				if !client.host {
					select {
					case client.roomin <- msg:
					default:
						fmt.Println("Dropping client", client)
						delete(r.clients, client)
					}
				}
			}
		}
	}
}
