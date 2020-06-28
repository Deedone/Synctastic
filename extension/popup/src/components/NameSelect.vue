<template>
  <div style="padding-top: 25px;">
    <p class="generic-text">Enter your name</p>
    <br />
    <input
      class="input"
      type="text"
      placeholder="John Doe"
      v-model="enteredName"
    />
    <button class="rect-button" @click="enter">Enter</button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";

@Component({
  name: "NameSelect",
})
export default class NameSelect extends Vue {
  enteredName = "";

  enter() {
    console.log("Enered name is ", this.enteredName);
    this.$emit("nameChanged", this.enteredName);
  }
}
</script>

<style lang="css"></style>
