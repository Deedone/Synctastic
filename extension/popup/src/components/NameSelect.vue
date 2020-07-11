<template>
  <div class="popupBody">
    <p class="generic-text">Enter your name</p><br>
    <input class="input" type="text" placeholder="John Doe" v-model="enteredName">
    <p class="secondary-text">The name is not unique and you will be able to change it later</p>
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
