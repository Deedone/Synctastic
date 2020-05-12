<template>
  <div id="app">
    <button @click="initOnTab">
      Start
    </button>
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
      inputTs = -1
      
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
        }
      }
      console.log(sender);
    },
    initOnTab(){
      chrome.runtime.sendMessage({type:"control",cmd:"init"});
    },
    sendControl(action){
      chrome.runtime.sendMessage({type:"control",cmd:"video",data:action})

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
