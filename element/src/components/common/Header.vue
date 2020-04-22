<template>
  <div class="header">
    <el-row :gutter="50" class="header-el-row">
      <el-col :xs="4" :sm="4" :md="4" :lg="4" :xl="4"><div class="grid-content"></div></el-col>
      <el-col class="el-col-title" v-for="(item, index) in headerList" :key="index" :xs="4" :sm="4" :md="4" :lg="4" :xl="4">
        <div class="col-item">
          <div class="col-item-text">
            <div  class="col-item-title">{{item.label}}</div>
            <a href="#" class="col-item-content hidden-sm-and-down">详情</a>
          </div>
        </div>
      </el-col>
      <el-col :xs="4" :sm="4" :md="4" :lg="4" :xl="4"></el-col>
    </el-row>
  </div>
</template>

<script>
import global, {headerList} from './global.js';

export default {
  props: {
    type: Number,
    title: String,
  },
  data () {
    return {
      headerList: headerList
    }
  },
  filters: {

  },
  computed: {

  },
  created() {

  },
  methods: {

  }

}
</script>

<style lang="less">
  .header {
    background-color: #87CEEB;
  }
  .header-el-row {

  }
  .header-el-row {
    .el-col {
      padding: 0 !important;
      min-height: 41px;
    }
    .el-col-title {
      max-width: 200px;
    }
  }
  .col-item {
    overflow: hidden;
    display: table;
    width: 100%;
    font-size: 14px;
    line-height: 1.2;
    height: 53px;
    .col-item-text {
      vertical-align: middle;
      color: white;
      display: table-cell;
      .col-item-title {
        font-weight: bold;
      }
      .col-item-content {
        font-size: 12px;
        color: white;
        min-width: 35px;
        padding-top: 4px;
        display: inline-block;
      }
      .col-item-content:hover {
        color: #00BFFF;
      }
    }
  }
</style>