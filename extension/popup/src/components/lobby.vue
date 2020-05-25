<template>
  <div style="padding-top: 25px;">
    <button @click="createRoom" class="rect-button">Create room</button>
    <button @click="joinRoom" class="rect-button">Join room</button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
  name: 'lobby'
})
export default class start extends Vue {
  createRoom(){

  }

  joinRoom(){

  }
}
</script>

<style lang="css">

</style>
