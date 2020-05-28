<template>
  <div id="app">
    <p>Network status: {{state.netstatus}}</p>
    <button @click="initOnTab">
      Start
    </button>
      <button @click="setHost()" >Be host</button>
    <div >
      <button @click="vidControl('play')" >Play</button>
      <button @click="vidControl('pause')">Pause</button>
    </div>
    <div>
      Video status is {{state.status}} <br>
      Current timestamp is {{state.timestamp}}
    </div>

    <button @click="createRoom">Create room</button>
    <input type="text" v-model="state.enteredRoomId">
    <button @click="joinRoom">Join room</button>
    <button @click="leaveRoom">Leave room</button>
    <div>
      Room id: {{state.roomId}}<br>
      Room users: {{state.roomUsers}}<br>
    </div>
    <div>Name : {{state.name}}</div>
    <button @click="clearName">Clear name</button>
  </div> 
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "../../../internal_message";

const DebugProps = Vue.extend({
    props: ['state']
})

@Component
export default class Debug extends DebugProps {
  /*name = 'App';
  status ="unknown";
  timestamp = 0;
  tab = "";
  netstatus = "";
  roomId = 0;
  roomUsers = 0;*/
  enteredRoomId = "";
  beforeMount(){
    console.log("taki before mount");
    chrome.runtime.onMessage.addListener((m) => this.onMessage(m));
    new InternalMessage(TO.BACKGROND, CMD.FETCH).send();
  }

  clearName(){
    new InternalMessage(TO.BACKGROND, CMD.SETNAME)
    .addArgs("")
    .send()
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

<style scope lang="css">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>