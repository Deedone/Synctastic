package main

import (
	"fmt"
	"math/rand"
	"time"
)

type Lobby struct {
	rooms map[*Room]bool
}

func newLobby() *Lobby {
	return &Lobby{
		rooms: make(map[*Room]bool),
	}
}

func (l *Lobby) createRoom() *Room {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	randID := 0
	unique := false
	for !unique {
		randID = r.Int() % 10000000
		unique = true
		for room := range l.rooms {
			if room.id == randID {
				unique = false
				break
			}
		}

	}

	room := newRoom(randID)
	fmt.Println("Created room", room)
	go room.run()
	l.rooms[room] = true
	return room
}

func (l *Lobby) joinRoom(id int, c *Client) bool {

	var room *Room = nil

	for r := range l.rooms {
		if r.id == id {
			room = r
			break
		}
	}

	if room == nil {
		return false
	}

	c.enterRoom(room)
	return true
}
