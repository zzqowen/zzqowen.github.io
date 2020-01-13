import Vue from 'vue'
import App from './App'
import router from './router'
import axios from 'axios'
import qs from 'Qs'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import 'element-ui/lib/theme-chalk/display.css'
import 'babel-polyfill'

Vue.use(ElementUI, {size: 'small'})
Vue.config.productionTip = false

Vue.prototype.$axios = axios;
Vue.prototype.$qs = qs;

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
