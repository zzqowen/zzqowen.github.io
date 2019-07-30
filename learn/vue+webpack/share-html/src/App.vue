<template>
  <div id="app">
    <transition :name="direction">
      <keep-alive>
        <router-view class="appView"></router-view>
      </keep-alive>
    </transition>
  </div>
</template>

<script>
  export default {
    name: 'App',
    data() {
      return {
        direction: "slide-left"
      }
    },
    watch: {
      $route(to, from) {
        console.log(to, from);
        let sPathArr = sessionStorage.getItem('pathArr') ? JSON.parse(sessionStorage.getItem('pathArr')) : [];
        let indexD = sPathArr.indexOf(JSON.stringify([to.name, from.name]));
        let indexS = sPathArr.indexOf(JSON.stringify([from.name, to.name]));
        if (indexD != -1) {
          this.direction = "slide-right";
          sPathArr.splice(indexD, 1);
        } else if (indexS == -1) {
          sPathArr.push(JSON.stringify([from.name, to.name]));
          this.direction = "slide-left";
        } else {
          this.direction = "slide-left";
        }
        sessionStorage.setItem('pathArr', JSON.stringify(sPathArr));
      }
    }
  }

</script>

<style>
  * {
    padding: 0;
    margin: 0;
  }

  html,
  body {
    height: 100%;
    width: 100%;
  }

  a {
    text-decoration: none;
  }

  .appView {
    position: absolute;
    width: 100%;
    transition: transform 0.3s ease-out;
  }

  .slide-left-enter {
    transform: translate(100%, 0);
  }

  .slide-left-leave-active {
    transform: translate(-100%, 0);
  }

  .slide-right-enter {
    transform: translate(-100%, 0);
  }

  .slide-right-leave-active {
    transform: translate(100%, 0);
  }

  .overText3 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}


  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    width: 100%;
    height: 100%;
  }

  .page {
    width: 100%;
    height: 100%;
  }

  .scroll {
    width: 100%;
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .bg_img {
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center center;
  }

  .one_ellipsis {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .arrow_right {
    width: 20rpx;
    height: 20rpx;
  }

  .flex-row {
    display: flex;
    flex-flow: row nowrap;
  }

  .flex-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
  }

  .flex-row-center-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: center;
  }

  .flex-around-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-around;
  }

  .flex-start-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: flex-start;
  }

  .flex-wrap-container {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: flex-start;
  }

  .flex-space-between-container {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    width: 100%;
  }

  .flex-space-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .flex-space-container-end {
    display: flex;
    flex-flow: row nowrap;
    align-items: flex-end;
    justify-content: space-between;
  }

  .flex-space-end {
    display: flex;
    flex-flow: row nowrap;
    align-items: flex-end;
  }

  .flex-space-warp-container {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: space-between;
  }

  .flex-space-end-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: end;
    justify-content: center;
    width: 100%;
  }

  .flex-center-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-around;
  }

  .flex-right-bottom-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: flex-end;
    justify-content: flex-end;
  }

  .flex-right-container {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: flex-end;
  }

  .flex-column-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: stretch;
    justify-content: flex-start;
  }

  .flex-column-between-container {
    display: flex;
    flex-flow: column nowrap;
    justify-content: space-between;
  }

  .flex-column-space-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: stretch;
    justify-content: space-between;
    width: 100%;
    height: 100%;
  }

  .flex-column-center-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
  }

  .flex-column-nojust-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: flex-start;
  }

  .flex-column-center-space-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: space-between;
  }

  .flex-column-center-end-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: flex-end;
  }

  .flex-column-center-around-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: space-around;
  }

  .flex-column-around-container {
    display: flex;
    flex-flow: column nowrap;
    justify-content: space-around;
  }

  .flex-grow {
    flex: 1;
  }

  .flex-stretch {
    align-items: stretch;
  }

  .flex-shrink {
    flex-shrink: 0;
  }

</style>
