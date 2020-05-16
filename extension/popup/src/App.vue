<template>
  <div id="app">
    <p>Network status: {{netstatus}}</p>
    <button @click="initOnTab">
      Start
    </button>
      <button @click="setHost()" >Be host</button>
    <p v-if="tab != -1"> Active on tab {{tab}}</p>
    <div v-if="tab != -1">
      <button @click="sendControl('play')" >Play</button>
      <button @click="sendControl('pause')">Pause</button>
      <input type="text" v-model="inputTs" @change="sendTimestamp"> 
    </div>
    <div>
      Video status is {{status}} <br>
      Current timestamp is {{timestamp}}
    </div>
  </div> 
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "./internal_message";

@Component
export default class App extends Vue {
  name = 'App';
  status ="unknown";
  timestamp = 0;
  tab = "";
  netstatus = "";

  beforeMount(){
    console.log("taki before mount");
    chrome.runtime.onMessage.addListener((m) => this.onMessage(m));
    chrome.runtime.sendMessage({type:"control", cmd:"fetch"});
  }

  onMessage(msg:InternalMessage):void{
    console.log(msg)
    if (msg.to != TO.POPUP){
      return;
    }

    if (msg.is(CMD.UPDATE) && msg.hasArgs(4)){
      this.status = msg.args[0] as string;
      this.timestamp = msg.args[1] as number;
      this.tab = msg.args[2] as string;
      this.netstatus = msg.args[3] as string;



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

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
