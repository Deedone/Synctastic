<template>
  <div class="popupBody">
    <p class="generic-text">Enter your name</p><br>
    <input class="input" type="text" placeholder="John Doe" v-model="enteredName"
      autofocus
      @keyup="onkeyup"
    
    >
    <p class="secondary-text">The name is not unique and you will be able to change it later</p>
    <button class="rect-button" @click="enter">Enter</button>
    <div id="errors" >
       <p v-for="err in state.errors" :key="err">{{err}}</p> 
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";

const SelectProps = Vue.extend({
  props: ["state"],
});
@Component({
  name: "NameSelect",
})
export default class NameSelect extends SelectProps {
  enteredName = "";

  enter() {
    console.log("Enered name is ", this.enteredName);
    this.$emit("nameChanged", this.enteredName);
  }

  onkeyup(event:any) {
    if (event.keyCode == 13) {
      this.enter();
    }
  }
}
</script>

<style lang="css"></style>
