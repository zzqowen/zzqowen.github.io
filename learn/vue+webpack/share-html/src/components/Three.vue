<template>
  <div class="page">
    <div class="scroll">
      <!-- :style="{backgroundImage:`url(${require('../assets/logo.png')})`}" -->
      <div class="header_img bg_img" ></div>
      <div class="header_title_container">
        <div class="header_title flex-space-container">
          <div class="header_title_left">Three{{data.num}}人参加</div>
          <div v-for="(item, index) in data.imgList" :key="index">
            <!-- <div class="bg_img" style="background-image:url('../assets/logo.png')"></div> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      data: {
        num: 5,
        imgList: [
          {img: '../assets/logo.png', name: 1}
        ]
      }
    }
  },
  created () {
    console.log()
  },
  methods: {

  }
}
</script>

<style scoped>
  .header_img {
    height: 400px;
    background-color: rgba(0, 0, 0, 0.8)
  }
  .header_title_container {
    height: 80px;
    position: relative;
  }
  .header_title {
    height: 100px;
    border-radius: 20px 20px 0 0;
    background-color: white;
    position: absolute;
    top: -20px;
    left: 0;
    width: 100%;
  }
  .header_title_left {
    font-size: 32px;
    color: #252122;
  }

</style>
