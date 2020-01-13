import Vue from 'vue'
import Router from 'vue-router'
import Frame from '@/components/common/Frame'
import Home from '@/components/pages/Home'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Frame',
      component: Frame,
      meta: {
        title: '首页'
      },
      children: [
        {
          path: '/home',
          name: 'Home',
          component: Home
        }
      ]
    }
  ]
})
