/* eslint-disable */
import 'lib-flexible';
import Vue from 'vue';
import App from './App';
import router from './router';
import axios from 'axios';
import qs from 'Qs';

axios.defaults.baseURL='https://erwen.aihuawen.com';
Vue.config.productionTip = false;
Vue.prototype.$axios = axios;
Vue.prototype.$qs = qs;

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
