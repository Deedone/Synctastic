package main

import "fmt"

type Room struct {
	clients   map[*Client]bool
	host      *Client
	broadcast chan string
	reg       chan *Client
	unreg     chan *Client
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
			client.bhandle = r.broadcast
			fmt.Println("Registering", client)
		case client := <-r.unreg:
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.c)
			}
		case msg := <-r.broadcast:
			for client := range r.clients {
				select {
				case client.c <- msg:
				default:
					close(client.c)
					delete(r.clients, client)
				}
			}
		}
	}
}
