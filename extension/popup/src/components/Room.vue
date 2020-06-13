<template>
  <div >
    <p id="room-id">Room ID:<br> <span>{{state.roomId}}</span></p><br>
    <button @click="leaveRoom" class="rect-button" id="leave">Leave room</button>
    <button v-if="state.host" @click="transferHostInit" class="rect-button" id="selhost">Change host</button>
    <div id="users-in-room">
      <div>
        <p v-for="user in state.roomUsers" 
        @click="tryTransferHost(user.id)"
        :key="user.id" 
        v-bind:class="{me:isHost(user), clickable:selectHost}" 
        class="user" >
          <i class="material-icons" >{{userIcon(selectHost)}}</i> 
          {{user.name}} 
        </p>
      </div>
    </div>
    <div v-if="state.serverCurrent" id="now-playing">
      <p>Now playing<i class="material-icons" id="play">play_arrow</i></p><br>
      <span>{{state.serverCurrent.tabName}}</span>

    </div>
    <a target="blank" href="https://forms.gle/2LRe3wdofcz59b8q8" id="report-bug">Report bug</a>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import { InternalMessage, TO, CMD } from '../../../internal_message';

const RoomProps = Vue.extend({
    props: ['state']
})
@Component({
  name: 'Room'
})
export default class Room extends RoomProps {

  constructor(){
    super();
    this.selectHost = false;

  }

  tryTransferHost(userId:number){
    if (!this.selectHost){
      return;
    }
    console.log("Transfering host to", userId);
    new InternalMessage(TO.BACKGROND, CMD.TRANSFERHOST )
    .addArgs(userId)
    .send();
    this.selectHost = false;

  }

  selectHost: boolean
  leaveRoom(){
    this.$emit("leaveRoom")
  }

  transferHostInit(){
    this.selectHost = true;
  }

  userIcon(state:boolean){
    if (!state){
      return "person_outline";
    }
    return "double_arrow"
  }

  isHost(user:any){
    return user.host;
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

#report-bug{
  position: absolute;
  width: 118px;
  height: 35px;
  text-decoration: underline;

  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
  font-size: 24px;
  line-height: 35px;

  /* identical to box height, or 146% */

  color: #046F55;
  bottom:9px;
  left:321px;
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

#selhost {
  position:absolute;
  top:253px;
  width: 156px;
  height: 38px;
  left:260px;
}

#users-in-room{
  position: absolute;
  width: 216px;
  height: 200px;
  border:1px solid #BABABA;
  top: 192px;
  left: 10px;
}

.clickable {
  cursor:pointer;
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
