<template>
  <div >
    <p id="room-id">Room ID:<br> <span>{{state.roomId}}</span></p><br>
    <button @click="leaveRoom" class="rect-button" id="leave">Leave room</button>
    <div id="users-in-room">
      <div>
        <p v-for="name in state.roomNames" :key="name" v-bind:class="{me:isMe(name)}" class="user" ><i class="material-icons" >person_outline</i> {{name}} </p>
      </div>
    </div>
    <div id="now-playing">
      <p>Now playing<i class="material-icons" id="play">play_arrow</i></p><br>
      <span>{{state.serverCurrent.name}}</span>

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

  isMe(name:string){
    return name == this.state.name;
  }

}
</script>

<style lang="css">

#play {
  color:#046F55;
}
#room-id span{
  color:black;
}
#room-id {
position: absolute;
width: 162px;
height: 67px;
left:10px;
top:100px;
margin:0;

font-family: Roboto;
font-style: normal;
font-weight: normal;
font-size: 36px;
line-height: 35px;
text-align:left;

/* or 97% */

color: #AAAAAA;
}
#leave {
  position: absolute;
  top:192px;
  left:260px;
  width: 156px;
height: 38px;
}

#users-in-room{
  position: absolute;
  width: 216px;
  height: 200px;
  border:1px solid #BABABA;
  top: 192px;
  left: 10px;
}

.user{
 width: 217px;
 text-align:left;
height: 35px;

font-family: Roboto;
font-style: normal;
font-weight: normal;
font-size: 24px;
line-height: 35px;
}

.user.me {
  color: #046F4F;
}
#now-playing {
  position: absolute;
width: 424px;
height: 122px;

font-family: Roboto;
font-style: normal;
font-weight: normal;
font-size: 36px;
line-height: 35px;
text-align:left;

top:407px;
left:10px;

color: #AAAAAA;
}
#now-playing span {
  color: black;
}
p {
  margin:0;
}
</style>
