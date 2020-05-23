<template>
  <div id="app">
    <p>Network status: {{netstatus}}</p>
    <button @click="initOnTab">
      Start
    </button>
      <button @click="setHost()" >Be host</button>
    <p v-if="tab != -1"> Active on tab {{tab}}</p>
    <div v-if="tab != -1">
      <button @click="vidControl('play')" >Play</button>
      <button @click="vidControl('pause')">Pause</button>
    </div>
    <div>
      Video status is {{status}} <br>
      Current timestamp is {{timestamp}}
    </div>

    <button @click="createRoom">Create room</button>
    <input type="text" v-model="enteredRoomId">
    <button @click="joinRoom">Join room</button>
    <button @click="leaveRoom">Leave room</button>
    <div>
      Room id: {{roomId}}<br>
      Room users: {{roomUsers}}<br>
    </div>
  </div> 
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "../../internal_message";

@Component
export default class App extends Vue {
  name = 'App';
  status ="unknown";
  timestamp = 0;
  tab = "";
  netstatus = "";
  roomId = 0;
  roomUsers = 0;
  enteredRoomId = "";

  beforeMount(){
    console.log("taki before mount");
    chrome.runtime.onMessage.addListener((m) => this.onMessage(m));
    new InternalMessage(TO.BACKGROND, CMD.FETCH).send();
  }

  createRoom() {
    new InternalMessage(TO.BACKGROND, CMD.INIT).send();
    new InternalMessage(TO.BACKGROND, CMD.CREATEROOM).send();
    new InternalMessage(TO.BACKGROND, CMD.BECOMEHOST).send();
  }

  joinRoom(){
    console.log("Join room")
    new InternalMessage(TO.BACKGROND, CMD.INIT).send();
    new InternalMessage(TO.BACKGROND, CMD.JOINROOM)
    .addArgs(parseInt(this.enteredRoomId))
    .send();
  }

  leaveRoom() {
    console.log("Leave room");
    new InternalMessage(TO.BACKGROND, CMD.KILL).send();
  }

  onMessage(inmsg:any):void{
    let msg = new InternalMessage(inmsg);
    console.log(msg)
    if (msg.to != TO.POPUP){
      return;
    }

    if (msg.is(CMD.UPDATE) && msg.hasArgs(4)){
      this.status = msg.args[0] as string;
      this.timestamp = msg.args[1] as number;
      this.tab = msg.args[2] as string;
      this.netstatus = msg.args[3] as string;
      this.roomId = msg.args[4] as number
      this.roomUsers = msg.args[5] as number
    }
  }
  initOnTab(){
    console.log("Button pressed")
    new InternalMessage(TO.BACKGROND, CMD.INIT).send()
  }
  vidControl(cmd:string){
    if (cmd == "play") {
      new InternalMessage(TO.BACKGROND, CMD.VIDEOCONTROL)
      .addArgs(new VideoState(VIDEOSTATUS.PLAY,0))
      .send();
    }
    if (cmd == "pause") {
      new InternalMessage(TO.BACKGROND, CMD.VIDEOCONTROL)
      .addArgs(new VideoState(VIDEOSTATUS.PAUSE,0))
      .send();
    }
  }
  setHost(){
    new InternalMessage(TO.BACKGROND, CMD.BECOMEHOST).send()
  }


}
</script>

<style lang="css">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
