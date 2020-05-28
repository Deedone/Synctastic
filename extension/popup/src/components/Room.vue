<template>
  <div style="padding-top: 25px;">
    <p>Room ID: {{state.roomId}}</p><br>
    <button @click="leaveRoom">Leave</button>
    <p>In room:</p><br>
    <div>
      <p v-for="name in state.roomNames" :key="name"> {{name}} </p>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

const RoomProps = Vue.extend({
    props: ['state']
})
@Component({
  name: 'Room'
})
export default class Room extends RoomProps {

  leaveRoom(){
    this.$emit("leaveRoom")
  }

}
</script>

<style lang="css">

</style>
