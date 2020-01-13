<template>
  <div class="app-container flex-column-container">
    <v-header></v-header>
    <div class="flex-grow">
      <transition name="move" mode="out-in">
          <keep-alive>
              <router-view></router-view>
          </keep-alive>
      </transition>
    </div>
    <v-footer></v-footer>
  </div>
</template>

<script>
  import vHeader from './Header.vue';
  import vFooter from './Footer.vue';
  import broadcast from './broadcast';


  export default {
    name: 'HelloWorld',
    components:{
      vHeader, vFooter
    },
    data () {
      return {
        msg: 'ooo'
      }
    },

  }
</script>

<style scoped>
  .app-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
