<template>
  <div>
    <p class="generic-text" style="margin-left:20px" >Room ID</p>
    <input type="text" class="input" id="room-id-input" placeholder="0000" v-model="enteredId">
    <p class="secondary-text" style="position: absolute; top: 90px; left:20px">Enter the ID of an existing room</p>
    <button class="rect-button" id="join-room" @click="enter">Enter</button>
    <button class="rect-button" id="join-room-return" @click="back">
      Back
    </button>
    <div id="errors" >
       <p v-for="err in state.errors" :key="err">{{err}}</p> 
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";

const JoinProps = Vue.extend({
  props: ["state"],
});
@Component({
  name: "JoinRoom",
})
export default class JoinRoom extends JoinProps {
  enteredId = "";

  enter() {
    this.$emit("joinRoom", this.enteredId);
  }
  back() {
    this.$emit("setStage", "lobby");
  }
}
</script>

<style lang="css">

#join-room {
  position:absolute;
  top:160px;
  left:22px;

}
#join-room-return {
  position:absolute;
  top:160px;
  right:22px;
}

#room-id-input {
  position:absolute;
  top:120px;
  width: 256px;
  left:21px;
}
#errors {
  color:red;
  position: absolute;
  top:243px;
  left:21px;

}
</style>
