package main

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

type Lobby struct {
	rooms    map[*Room]bool
	roomLock sync.Mutex
}

func newLobby() *Lobby {
	return &Lobby{
		rooms:    make(map[*Room]bool),
		roomLock: sync.Mutex{},
	}
}

func (l *Lobby) createRoom() *Room {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	l.roomLock.Lock()
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
	fmt.Printf("Created room %+v\n", room)
	go room.run()
	l.rooms[room] = true
	l.roomLock.Unlock()
	go l.clearRooms()
	return room
}

func (l *Lobby) clearRooms() {
	l.roomLock.Lock()

	for room := range l.rooms {
		if len(room.clients) == 0 {
			fmt.Printf("Cleaning room %+v\n", room)
			room.stop()
			delete(l.rooms, room)
		}
	}

	l.roomLock.Unlock()
}

func (l *Lobby) joinRoom(id int, c *Client) bool {

	var room *Room = nil

	l.roomLock.Lock()
	for r := range l.rooms {
		if r.id == id {
			room = r
			break
		}
	}

	if room == nil {
		l.roomLock.Unlock()
		return false
	}

	c.enterRoom(room)
	l.roomLock.Unlock()
	return true
}
