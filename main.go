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
var lobby = newLobby()

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
	client.enterLobby(lobby)
}

func handleHttp(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Got keepalive")
	w.WriteHeader(200)
	w.Write([]byte("nice"))
}

func main() {
	var port = os.Getenv("PORT")
	if port == "" {
		port = "1313"
	}

	http.HandleFunc("/keepalive", handleHttp)
	http.HandleFunc("/", handleWebsocket)
	fmt.Println("LISTENING", port)
	fmt.Println(http.ListenAndServe("0.0.0.0:"+port, nil))
}
