<template>
  <div style="text-align: left; padding-left:20px">
    <p class="generic-text">Enter your name</p><br>
    <input class="input" type="text" placeholder="John Doe" v-model="enteredName"
      autofocus
      @keyup="onkeyup"
    
    >
    <p class="secondary-text">You can always change it in the settings</p>
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
  enteredName = this.state.name;

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

<style lang="css">
</style>
