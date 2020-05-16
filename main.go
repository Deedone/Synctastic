package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
var room = newRoom()

func handleWebsocket(w http.ResponseWriter, r *http.Request) {

	fmt.Println("Got connection", r.Host)
	if r.Method != "GET" {
		fmt.Println("ONLY GET")
		http.Error(w, "ONLY GET", http.StatusMethodNotAllowed)
	}
	ws, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Println("Cannot upgrade", err)
		return
	}

	client := fromWS(ws)
	client.enterRoom(room)
}

func main() {
	var port = os.Getenv("PORT")
	if port == "" {
		port = "1313"
	}
	go room.run()

	http.HandleFunc("/", handleWebsocket)
	fmt.Println("LISTENING", port)
	fmt.Println(http.ListenAndServe("0.0.0.0:"+port, nil))
}
