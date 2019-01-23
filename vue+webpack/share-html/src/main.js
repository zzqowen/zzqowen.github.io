/* eslint-disable */
import 'lib-flexible';
import Vue from 'vue';
import App from './App';
import router from './router';
import axios from 'axios';
import qs from 'Qs';

// let server = 'http://test1.aihuawen.com';
let server = 'https://erwen.aihuawen.com';
axios.defaults.baseURL=server;
Vue.prototype.server = server;
Vue.config.productionTip = false;
Vue.prototype.$axios = axios;
Vue.prototype.$qs = qs;

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
