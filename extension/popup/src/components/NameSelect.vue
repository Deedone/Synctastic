<template>
  <div style="padding-top: 25px;">
    <p>Enter your name</p><br>
    <input type="text" placeholder="John Doe" v-model="enteredName">
    <button @click="enter">Enter</button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
  name: 'NameSelect'
})
export default class NameSelect extends Vue {

  enteredName = ""

  enter() {
    console.log("Enered name is ", this.enteredName)
    this.$emit("nameChanged", this.enteredName);
  }

}
</script>

<style lang="css">

</style>
