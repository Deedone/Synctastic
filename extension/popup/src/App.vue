<template>
  <div id="app" style="height: 400px;">
    <div class="topbar">
      {{topbarTitle[state.stage]}}
      <button class="topbar-button">
        <i class="material-icons" id="topbar-button-icon">help_outline</i>
      </button>
    </div class="popupBody">
      <div v-if="!debug">
        <NameSelect v-if="state.stage == 'name'"
         @nameChanged="changeName" ></NameSelect>
        <Lobby v-if="state.stage == 'lobby'"
          @setStage="setStage"
          @createRoom="createRoom"
        ></Lobby>
        <JoinRoom v-if="state.stage == 'join'"
          @setStage="setStage"
         @joinRoom="joinRoom"></JoinRoom>
         <Room v-if="state.stage == 'room'"
                :state="state"
                @leaveRoom="leaveRoom"
         ></Room>
      </div>
      <Debug v-else :state="state"></Debug>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import Debug from "./components/debug.vue"
import start from './components/start.vue';
import Lobby from './components/lobby.vue';
import NameSelect from './components/NameSelect.vue';
import JoinRoom from './components/JoinRoom.vue';
import Room from './components/Room.vue';

import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "../../internal_message";


@Component({
  name: 'App',
  components: {
    start,
    Lobby,
    Debug,
    NameSelect,
    JoinRoom,
    Room
  }
})

export default class App extends Vue {
  name = 'App';
  state = {
    status :"unknown",
    id:0,
    timestamp : 0,
    netstatus : "",
    roomId : 0,
    roomUserCount : 0,
    roomUsers : [],
    stage : "name",
    name: "",
    serverCurrent: undefined
  }
  debug = false
  topbarTitle = {
    "name": "Getting started",
    "lobby": "Wellcome",
    "join": "Enter room id",
    "room": "In room",
  }

  toggleDebug(){
    this.debug = !this.debug;
  }

  isValidName(name:string):boolean{
    return typeof name == typeof "" && name.length > 3;
  }
  changeName(name:string){
    console.log(name);
    if (!this.isValidName(name)){
      return;
    }
    new InternalMessage(TO.BACKGROND, CMD.SETNAME)
    .addArgs(name)
    .send();
  }

  setStage(stage:string){
    if (stage == "join"){
      this.state.stage = stage;
    }
    if (stage == "lobby"){
      this.state.stage = stage;
    }
  }


  beforeMount(){
    console.log("taki before mount");
    chrome.runtime.onMessage.addListener((m) => this.onMessage(m));
    //Load state from shared storage
    chrome.storage.local.get("state", resp => {
      if (typeof resp.state == typeof {}){
        this.state = resp.state;
        this.processInitialData();
      }
    })

    chrome.storage.onChanged.addListener(changes => {
      console.log("Got state update")
      for (let key in changes){
        if (key == "state"){
          console.log("State key correct")
          this.state = changes[key].newValue;
          console.log(this.state)
          this.processInitialData();
        }
      }
    });

  }

  processInitialData(){
    console.log("Got name from state", this.state.name)
    if (!this.isValidName(this.state.name)){
      this.state.stage = "name";
    }
      //this.state.stage = "room";

  }

  createRoom() {
    console.log("Create Room");
    new InternalMessage(TO.BACKGROND, CMD.INIT).send();
    new InternalMessage(TO.BACKGROND, CMD.CREATEROOM).send();
    new InternalMessage(TO.BACKGROND, CMD.BECOMEHOST).send();
  }

  joinRoom(id:string|number){
    console.log("Join room")
    if (isNaN(id as number)){
      console.log("Invalid ID");
      return;
    }
    new InternalMessage(TO.BACKGROND, CMD.INIT).send();
    new InternalMessage(TO.BACKGROND, CMD.JOINROOM)
    .addArgs(parseInt(id as string))
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
  setHost(){
    new InternalMessage(TO.BACKGROND, CMD.BECOMEHOST).send()
  }
}
</script>

<style lang="css">
html, body {
  font-family: 'Roboto', sans-serif;
  width: 300px;
  height: 500px;
  margin: 0px;
  padding: 0px;
  border: none;
}


* {
  box-sizing: border-box;
}
#app {
  /*font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;*/
  width: 100%;
  background-color: #FEFEFE;
}

.popupBody {
  text-align: left;
  padding-left: 20px;
  padding-top: 20px;
}
.topbar {
  background: #046F55;
  width: 100%;
  height: 50px;
  box-shadow: 0px 3px 2px #AEAEAE;
  font-size: 22px;
  color: #FEFEFE;
  display: inline-block;
  text-align: left;
  line-height: 50px;
  padding-left: 20px;
  padding-right: 20px;
  vertical-align: middle;
}
.topbar-button {
  background: transparent;
  width: 20px;
  height: 25px;
  border: 1px black;
  position: absolute;
  right: 18px;
  top: 15px;
  display: inline-block;
  vertical-align: middle;
}

.topbar-button:hover {
  transform: scale(1.2);
}

.topbar-button:focus {
  outline: 0;
}

#topbar-button-icon {
  width: 20px;
  height: 25px;
  position: absolute;
  right: 0px;
  top: 0px;
  color: white;
}

.rect-button {
  background-color: #046F55;
  border: none;
  color: white;
  width: 120px;
  height: 35px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  margin-bottom: 10px;
}

.rect-button:hover {
  background-color: #015F48;
  box-shadow: 0px 3px 2px #AEAEAE;
}

.rect-button:focus {
  outline: 0;
}

.generic-text {
/* width: 194px; */
text-align:left;
height: 22px;

font-family: Roboto;
font-style: normal;
font-weight: normal;
font-size: 22px;
line-height: 22px;
/* or 125% */

color: #000000;

}
.secondary-text {
  height: 45px;
  font-size: 13px;
  line-height: 16px;
  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
  color: #808080;
  padding-right: 59px;
  padding-top: 10px;
}

.input {
  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  width: 216px;
  height: 35px;
  border: 2px solid #BABABA;
  border-radius: 3px;
}

.input:focus {
  border: 2px solid #4f4f4f;
}




</style>
