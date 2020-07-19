<template>
  <div class="popupBody">
      <div class="toggle-setting">
        <p class="text">
          Host notification
        </p>
        <label class="switch">
          <input type="checkbox" 
          v-model="hostNotify" @change="sendSettings">
          <span class="slider round"></span>
        </label>
      </div>
      <div class="toggle-setting">
        <p class="text">
          Kick notification
        </p>
        <label class="switch">
          <input type="checkbox" 
          v-model="leaveNotify" @change="sendSettings">
          <span class="slider round"></span>
        </label>
      </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import {CMD, TO, InternalMessage} from "../../../internal_message";

const SettingsProps = Vue.extend({
  props: ["state"],
});
@Component({
  name:"Settings"
})
export default class Settings extends SettingsProps {
  hostNotify:boolean = this.state.settings.hostNotify;
  leaveNotify:boolean = this.state.settings.leaveNotify;

  sendSettings() {
    console.log("Send settings");
    new InternalMessage(TO.BACKGROND, CMD.SETTING)
    .addArgs("hostNotify")
    .addArgs(this.hostNotify)
    .send();
    new InternalMessage(TO.BACKGROND, CMD.SETTING)
    .addArgs("leaveNotify")
    .addArgs(this.leaveNotify)
    .send();
  }


}

</script>

<style lang="css">

.toggle-setting .text {
    width: 200px;
    float: left;
    font-size: 17px;
    padding-top: 7px;
}
.toggle-setting {
  margin-bottom: 10px;
}

 /* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #046f55;
}

input:focus + .slider {
  box-shadow: 0 0 1px #046f55;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
} 

</style>
