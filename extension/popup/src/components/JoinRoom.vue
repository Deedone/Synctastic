<template>
  <div class="popupBody">
    <p class="generic-text">Room ID</p>
    <input type="text" class="input" id="room-id-input" placeholder="0000" v-model="enteredId">
    <p class="secondary-text" style="position: absolute; top: 90px;">Enter the ID of an existing room</p>
    <button class="rect-button" id="join-room" @click="enter">Enter</button>
    <button class="rect-button" id="join-room-return" @click="back">Back</button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
  name: 'JoinRoom'
})
export default class JoinRoom extends Vue {

  enteredId = ""

  enter() {
    this.$emit("joinRoom", this.enteredId);
  }
  back() {
    this.$emit("setStage", "lobby")
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
  left:21px;
}

</style>
