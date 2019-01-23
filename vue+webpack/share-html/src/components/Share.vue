<template>
  <div class="page">
    <my-scroll ref="myScrollRef" :on-refresh="onRefresh" :on-pull="onPull" :get-scroll-top="getTop" :scroll-state="scrollState">
      <div slot="scrollList">
        <div class="header_img bg_img" :style="{backgroundImage:`url(${handleImg(dataObj.bannerList[0] ? dataObj.bannerList[0].imgPath : '')})`}"></div>
        <div class="header_title_container">
          <div class="header_title flex-space-container" v-for="(item, index) in dataObj.categoryList" :key="index"
            v-if="categoryId == item.id">
            <div class="header_title_left" @click="tap">已有{{item.counts}}人参加</div>
            <div class="flex-container">
              <div v-for="(item1, index1) in item.memberList" :key="index1" :class="['bg_img','default_bg_color','title_avatar',index1 != 0 ? 'ta_margin': '']"
                :style="{backgroundImage:`url(${handleImg(item1.memberPhoto)})`}"></div>
            </div>
          </div>
        </div>
        <div>
          <div v-for="(item, index) in dataObj.helpGroupList" :key="index" class="list_item">
            <div class="list_item_title">{{item.title}}</div>
            <div class="list_item_content overText3">{{item.describes}}</div>
            <div class="flex-wrap-container content_img_container">
              <div :class="['bg_img','content_img', (indexImg + 1)%3 == 0 ? '': 'content_img_margin']" v-for="(itemImg, indexImg) in item.photoFiles.slice(0, 3)"
                :key="indexImg" :style="{backgroundImage:`url(${handleImg(itemImg.littleImage)})`}"></div>
            </div>
            <div class="flex-space-container avatar_info">
              <div class="flex-container">
                <div class="bg_img list_item_avatar" :style="{backgroundImage:`url(${handleImg(item.memberPhoto)})`}"></div>
                <div class="list_item_name">{{item.memberName}}</div>
              </div>
              <div v-if="item.endTime != 0" class="list_item_endTime">距离悬赏结束时间<span class="list_item_endTime_text">{{handleTime(item.endTime)}}</span></div>
              <div v-if="item.endTime == 0" class="list_item_endTime" style="color: #BBBBBB">悬赏结束</div>
            </div>
            <div class="flex-space-container item_createTime">{{item.createTime}}</div>
          </div>
        </div>
      </div>
    </my-scroll>
    <a href="http://erwen.aihuawen.com/static/erwendown/download.html" class='commit'>发布</a>
  </div>
</template>
<script>
  import myScroll from "../components/Scrollview";
  import imgs from '../../static/img.json';

  export default {
    name: 'Share',
    data() {
      return {
        server: this.server,
        scrollState: true, //是否可以滑动
        indexScrollTop: 0,
        data: {
          num: 5,
          imgList: [{},
            {},
            {},
            {}
          ],
          imgs: imgs.images,
        },
        dataObj: {
          categoryList: [],
          bannerList: [{
            imgPath: ''
          }],
          helpGroupList: []
        },
        categoryId: this.GetRequest().categoryId ? this.GetRequest().categoryId :'37',
        pageIndex: 1,
        pageSize: 10
      }
    },
    components: {
      myScroll
    },
    created() {
      // console.log('试试',this.GetRequest())
      this.onRefresh();
    },
    methods: {
      GetRequest() {
        var url = location.search; //获取url中"?"符后的字串
        var theRequest = new Object();
        if (url.indexOf("?") != -1) {
            var str = url.substr(1);
            var strs = str.split("&");
            for(var i = 0; i < strs.length; i ++) {
              theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);
            }
        }
        return theRequest;
      },
      getData(cb) {
        this.$axios
          .post("/api/v1/B_001", this.$qs.stringify({
            categoryId: this.categoryId,
            pageIndex: this.pageIndex,
            pageSize: this.pageSize
          }))
          .then(res => {
            console.log(res.data.data);
            document.title = res.data.data.bannerList[0].title
            var data = res.data;
            cb && cb(data);
          })
      },
      handleImg(img) {
        if (!img) return '';
        return this.server + img
      },
      tap() {
        this.$router.push('/Loadding');
      },
      handleTime(time) {
        var minute = parseInt(time / 60000);
        var second = parseInt(time / 1000) - minute * 60;

        function d(t) {
          if (t < 10) {
            return '0' + t
          }
          return t;
        }
        return d(minute) + ':' + d(second);
      },
      onRefresh(mun) { // 刷新
        var that = this;
        this.pageIndex = 1;
        this.getData(function (res) {
          console.log(res)
          if (res.code == 1000) {
            that.dataObj = res.data;
            that.$refs.myScrollRef.setState(3);
          } else {
            that.$refs.myScrollRef.setState(3);
          }
          that.$refs.myScrollRef.setState(0);
        })
      },
      onPull(mun) { //加载
        var that = this;
        this.pageIndex ++;
        this.getData(function (res) {
          var dataObj = that.dataObj;
          if (res.code == 1000 && res.data.helpGroupList.length > 0) {
            res.data.helpGroupList.map((v, k) => {
              dataObj.helpGroupList.push(v);
            });
            that.$refs.myScrollRef.setState(5);
          } else {
            that.$refs.myScrollRef.setState(7);
          }
          that.dataObj = dataObj;
        })
      },
      getTop(y) { //滚动条位置
        this.indexScrollTop = y;
      },
    }
  }

</script>

<style scoped>
  .header_img {
    height: 400px;
    background-color: rgba(0, 0, 0, 0.8)
  }
  .default_bg_color {
    background-color: #919191;
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

  .list_item {
    background: white;
    padding: 50px 40px 60px;
    position: relative;
  }

  .list_item::after {
    display: table;
    content: '';
    height: 0;
    width: 89%;
    border-bottom: 2px solid #eee;
    position: absolute;
    bottom: 0;
    left: 5.5%;
  }

  .list_item_title {
    font-size: 30px;
    color: #212121;
    line-height: 1.2;
    font-weight: bold;
    text-align: left;
  }

  .list_item_content {
    text-align: left;
    padding-top: 20px;
    color: #212121;
  }

  .list_item_avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .list_item_name {
    font-size: 24px;
    color: #212121;
    font-weight: bold;
    padding-left: 10px;
  }

  .list_item_endTime {
    font-size: 24px;
    color: #3C3C3C;
    font-weight: bold;
  }

  .list_item_endTime_text {
    color: #FD4277;
    font-size: 24px;
    min-width: 80px;
    display: inline-block
  }

  .avatar_info {
    padding-top: 18px;
  }

  .content_img {
    width: 210px;
    height: 180px;
    border-radius: 5px;
  }

  .content_img_margin {
    margin-right: 20px;
    margin-bottom: 12px;
  }

  .content_img_container {
    padding-top: 12px;
  }

  .commit {
    width: 160px;
    height: 80px;
    border-radius: 40px;
    background: #FD4277;
    font-size: 30px;
    color: white;
    position: fixed;
    bottom: 100px;
    left: 50%;
    margin-left: -80px;
    line-height: 80px;
    font-weight: bold;
  }
  .item_createTime {
    color: #888;
    font-size: 24px;
    padding-top: 20px;
  }
</style>
