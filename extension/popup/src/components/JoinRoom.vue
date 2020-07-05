<template>
  <div style="padding-top: 25px;">
    <p class="generic-text">Room ID</p>
    <input
      type="text"
      class="input"
      id="room-id-input"
      placeholder="0000"
      v-model="enteredId"
    />
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
  position: absolute;
  top: 282px;
  left: 26px;
  width: 156px;
  height: 38px;
}
#join-room-return {
  position: absolute;
  top: 282px;
  right: 26px;
  width: 156px;
  height: 38px;
}

#room-id-input {
  position: absolute;
  top: 146px;
  left: 21px;
}
#errors {
  color:red;
  position: absolute;
  top:223px;
  left:21px;

}
</style>
