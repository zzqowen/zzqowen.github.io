<template>
  <div class="page">
    <div class="scroll">
      <!-- :style="{backgroundImage:`url(${require('../assets/logo.png')})`}" -->
      <div class="header_img bg_img" ></div>
      <div class="header_title_container">
        <div class="header_title flex-space-container">
          <div class="header_title_left" @click="tap">已有{{data.num}}人参加</div>
          <div class="flex-container">
            <div v-for="(item, index) in data.imgList" :key="index" :class="['bg_img','title_avatar',index != 0 ? 'ta_margin': '']" :style="{backgroundImage:`url(${data.imgs[2].src})`}"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import imgs from '../../static/img.json';
export default {
  name: 'Share',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      data: {
        num: 5,
        imgList: [
          {},
          {},
          {},
          {}
        ],
        imgs: imgs.images
      }
    }
  },
  created () {
    console.log(this.data.imgs);
  },
  methods: {
    getData() {
      this.$axios
      .post(global.nodeEnv("/back/branches/keywords/getObj"), this.$qs.stringify({}))
      .then(res => {
        console.log(res)
      })
    },
    tap() {
      this.$router.push('/Loadding');
    }
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
    padding: 0 38px 0 48px;
    box-sizing: border-box;
    border-bottom: 2px solid #eee;
  }
  .header_title_left {
    font-size: 32px;
    color: #252122;
  }
  .title_avatar {
    width: 66px;
    height: 66px;
    border-radius: 50%;
    border: 4px solid white;
  }
  .ta_margin {
    margin-left: -22px;
  }

</style>
