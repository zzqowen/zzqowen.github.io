const path = require('path')
const glob = require('glob')
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const config = require('../config')

const assetsPath = function (_path) {
  return path.join(config.build.assetsRoot, _path)
}

let entrys = {}
let htmls = []

const outerFile = glob.sync('./!(package|package-lock).*').concat(glob.sync('./!(node_modules|build|config|dist)/'))

function createHtml(html, chunks) {
  // console.log(chunks)
  return new HtmlWebpackPlugin({
    filename: assetsPath(html),
    template: html,
    inject: true,
    minify: {
      removeComments: false,
      collapseWhitespace: false,
      removeAttributeQuotes: false
      // more options:
      // https://github.com/kangax/html-minifier#options-quick-reference
    },
    chunks: [chunks]
    // necessary to consistently work with multiple chunks via CommonsChunkPlugin
  })
}

function judgeHtmlExist(files) {
  for (var i in files) {
   if (/\.(htm|html).*$/ig.test(files[i])) {
     let str = files[i]
     let name = str.substring(str.lastIndexOf('/') + 1, str.lastIndexOf('.'))
     return name
   }
  }
  return false
}

function resortFiles(files) {
  if (!files) return ''
  let i = 0;
  let len = files.length;
  let arr = []
  while (i < len) {
    if (/\.(htm|html).*$/ig.test(files[i])) {
      let spliceArr = files.splice(i, 1)
      arr = arr.concat(spliceArr)
    } else {
      i++
    }
  }
  return files.concat(arr)
}

function judgeFileType(file) {
  let files = resortFiles(file) //file文件list排序，html文件路径放到list最后
  files.forEach((item, index) => {
    if (!!judgeHtmlExist(files)) {
      let name = judgeHtmlExist(files)
      if (/\.(js|css|less|sass|scss)$/ig.test(item)) {
        if (!entrys[name]) entrys[name] = [item]
        else entrys[name].push(item)
      }
      if (/\.(htm|html).*$/ig.test(item)) {
        htmls.push(createHtml(item, name))
      }
    }
    if (fs.lstatSync(item).isDirectory()) {
      judgeFileType(glob.sync(item + '**.*').concat(glob.sync(item + '*/')))
    }
  })
}

judgeFileType(outerFile)

module.exports = {
  entrys,
  htmls
}


// console.log('垃圾啊的方式来', outerFile, entrys)
// console.log('拉加上劳动法', htmls)