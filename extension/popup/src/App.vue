<template>
  <div id="app">
    <p>Network status: {{netstatus}}</p>
    <button @click="initOnTab">
      Start
    </button>
      <button @click="sendControl('net','beHost')" >Be host</button>
    <p v-if="tab != -1"> Active on tab {{tab}}</p>
    <div v-if="tab != -1">
      <button @click="sendControl('video','play')" >Play</button>
      <button @click="sendControl('video','pause')">Pause</button>
      <input type="text" v-model="inputTs" @change="sendTimestamp"> 
    </div>
    <div>
      Video status is {{status}} <br>
      Current timestamp is {{timestamp}}
    </div>
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {
  },
  data: function() {
    return {
      status:"unknown",
      timestamp: 0,
      tab: -1,
      netstatus: -1,
    }
  },

  beforeMount(){
    chrome.runtime.onMessage.addListener((m,sender) => this.onMessage(m, sender));
    chrome.runtime.sendMessage({type:"control", cmd:"fetch"});
  },

  methods: {
    onMessage(msg, sender){
      if (msg.type == "view"){
        if (msg.cmd == "chtab"){
          this.tab = msg.data;
        }
        if (msg.cmd == "update"){
          this.status = msg.data.status;
          this.timestamp = msg.data.timestamp;
          this.tab = msg.data.tab;
          this.netstatus = msg.data.netstatus
        }
      }
      console.log(sender);
    },
    initOnTab(){
      chrome.runtime.sendMessage({type:"control",cmd:"init"});
    },
    sendControl(cmd, action){
      chrome.runtime.sendMessage({type:"control",cmd:cmd,data:action})

    },
    sendTimestamp(){
      chrome.runtime.sendMessage({type:"control",cmd:"video",data:"timeupdate"})
    }


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
