import Vue from 'vue';
import Router from 'vue-router';
import Share from '@/components/Share';
import Loadding from '@/components/Loadding';
import Three from '@/components/Three';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Share',
      component: Share
    },
    {
      path: '/Loadding',
      name: 'Loadding',
      component: Loadding,
    },
    {
      path: '/Three',
      name: 'Three',
      component: Three
    }
  ]
});
