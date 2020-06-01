<template>
  <div style="padding-top: 25px;">
    <p class="generic-text">Room ID:</p>
    <input type="text" class="input" placeholder="0000" v-model="enteredId">
    <button class="rect-button" @click="enter">Enter</button>
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

}
</script>

<style lang="css">

</style>
