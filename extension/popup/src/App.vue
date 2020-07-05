<template>
  <div id="app" style="height: 400px;">
    <div class="topbar">
      {{ topbarTitle[state.stage] }}
      <a href="https://github.com/Deedone/Synctastic#running" target="_blank" class="topbar-button" >
        <i class="material-icons" id="topbar-button-icon">help_outline</i>
      </a>
    </div>
    <div v-if="!debug">
      <NameSelect
        v-if="state.stage == 'name'"
        @nameChanged="changeName"
      ></NameSelect>
      <Lobby
        v-if="state.stage == 'lobby'"
        @setStage="setStage"
        @createRoom="createRoom"
      ></Lobby>
      <JoinRoom
        v-if="state.stage == 'join'"
        @setStage="setStage"
        @joinRoom="joinRoom"
        :state="state"
      ></JoinRoom>
      <Room
        v-if="state.stage == 'room'"
        :state="state"
        @leaveRoom="leaveRoom"
      ></Room>
    </div>
    <Debug v-else :state="state"></Debug>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import Debug from "./components/debug.vue";
import start from "./components/start.vue";
import Lobby from "./components/lobby.vue";
import NameSelect from "./components/NameSelect.vue";
import JoinRoom from "./components/JoinRoom.vue";
import Room from "./components/Room.vue";

import {
  InternalMessage,
  VideoState,
  TO,
  CMD,
  VIDEOSTATUS,
} from "../../internal_message";

@Component({
  name: "App",
  components: {
    start,
    Lobby,
    Debug,
    NameSelect,
    JoinRoom,
    Room,
  },
})
export default class App extends Vue {
  name = "App";
  state = {
    status: "unknown",
    id: 0,
    timestamp: 0,
    netstatus: "",
    roomId: 0,
    roomUserCount: 0,
    roomUsers: [],
    stage: "name",
    name: "",
    serverCurrent: undefined,
    errors : [] as string[],
  };
  debug = false;
  topbarTitle = {
    name: "Getting started",
    lobby: "Wellcome",
    join: "Enter room id",
    room: "In room",
  };

  toggleDebug() {
    this.debug = !this.debug;
  }

  isValidName(name: string): boolean {
    return typeof name == typeof "" && name.length > 0;
  }
  changeName(name: string) {
    console.log(name);
    if (!this.isValidName(name)) {
      return;
    }
    new InternalMessage(TO.BACKGROND, CMD.SETNAME).addArgs(name).send();
  }

  setStage(stage: string) {
    if (stage == "join") {
      this.state.stage = stage;
    }
    if (stage == "lobby") {
      this.state.stage = stage;
    }
  }

  beforeMount() {
    new InternalMessage(TO.BACKGROND, CMD.POPUPOPEN).send();
    chrome.runtime.onMessage.addListener((m) => this.onMessage(m));
    //Load state from shared storage
    chrome.storage.local.get("state", (resp) => {
      if (typeof resp.state == typeof {}) {
        this.state = resp.state;
        this.processInitialData();
      }
    });

    chrome.storage.onChanged.addListener((changes) => {
      console.log("Got state update");
      for (let key in changes) {
        if (key == "state") {
          console.log("State key correct");
          this.state = changes[key].newValue;
          console.log(this.state);
          this.processInitialData();
        }
      }
    });
  }

  processInitialData() {
    console.log("Got name from state", this.state.name);
    if (!this.isValidName(this.state.name)) {
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

  joinRoom(id: string | number) {
    this.state.errors = [] as string[];
    
    console.log("Join room");
    if (isNaN(id as number)) {
      console.log("Invalid ID");
      this.state.errors = ["ID must be a number"]
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

  onMessage(inmsg: any): void {
    let msg = new InternalMessage(inmsg);
    console.log(msg);
    if (msg.to != TO.POPUP) {
      return;
    }
  }
  setHost() {
    new InternalMessage(TO.BACKGROND, CMD.BECOMEHOST).send();
  }
}
</script>

<style lang="css">
html,
body {
  font-family: "Roboto", sans-serif;
  width: 452px;
  height: 600px;
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
  text-align: center;
  width: 100%;
  background-color: #fefefe;
}
.topbar {
  background: #046f55;
  width: 100%;
  height: 67px;
  box-shadow: 0px 3px 2px #aeaeae;
  font-size: 26px;
  color: #fefefe;
  display: inline-block;
  text-align: left;
  line-height: 67px;
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
  top: 23px;
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
  background-color: #046f55;
  border: none;
  color: white;
  width: 120px;
  height: 35px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
}

.rect-button:hover {
  background-color: #015f48;
  box-shadow: 0px 3px 2px #aeaeae;
}

.rect-button:focus {
  outline: 0;
}

.generic-text {
  /* width: 194px; */
  text-align: left;
  height: 30px;
  margin: 5px;
  margin-left: 21px;

  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
  font-size: 24px;
  line-height: 30px;

  /* or 125% */

  color: #000000;
}

.input {
  width: 216px;
  height: 35px;
}
</style>
