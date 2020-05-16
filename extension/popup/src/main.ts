import Vue from 'vue'
import App from './App.vue'
import {InternalMessage, VideoState, TO, CMD, VIDEOSTATUS} from "./internal_message";

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
