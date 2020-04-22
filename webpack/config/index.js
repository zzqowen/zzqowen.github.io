const path = require('path')
module.exports = {
  dev: {
    assetsPublicPath: './',
    assetsSubDirectory: 'static'
  },
  build: {
    index: path.resolve(__dirname, '../dist/index.html'),
    assetsRoot: path.resolve(__dirname, '../dist'),
    assetsPublicPath: './',
    assetsSubDirectory: './',

    productionSourceMap: false
  }
}