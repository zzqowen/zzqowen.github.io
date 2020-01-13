'use strict'
const path = require('path')
const utils = require('./utils')
const webpack = require('webpack')
const config = require('../config')
const chalk = require('chalk')
const merge = require('webpack-merge')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const baseWebpackConfig = require('./webpack.base.conf')
const filePath = require('./files')

const env = require('../config/prod.env')
// console.log({
//   rules: utils.styleLoaders({
//       sourceMap: config.build.productionSourceMap,
//       usePostCss: true
//     })
// })

const handlePath = function(name, type) {
  console.log(name)
  if (!(name == '[name]')) {
    let path = filePath.entrys[name][0] ? filePath.entrys[name][0] : '';
    let pathStr = path.substring(0, path.lastIndexOf('/'))
    console.log('垃圾是打发', filePath.entrys[name], name, pathStr + '/' + name + '.' + type)
    return pathStr + '/' + name + '.' + type
  } else {
     return  '[name].' + type
  }
}

let webpackConfig = merge(baseWebpackConfig, {
  module: {
    rules: utils.styleLoaders({
      sourceMap: config.build.productionSourceMap,
      extract: true,
      usePostCss: true
    })
  },
  output: {
    path: config.build.assetsRoot,
    //  utils.assetsPath(handlePath('[name]') + '/[name].js'),
    filename: (data) => handlePath(data.chunk.name, 'js'),
    chunkFilename: utils.assetsPath('common/[name]-[hash:8].js?v=[hash:6]'),
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': env
    }),
    new MiniCssExtractPlugin({
      // path: config.build.assetsRoot,
      filename: utils.assetsPath('[path]/[name].css'),
      chunkFilename: utils.assetsPath('css/[name].css'),
      ignoreOrder: false
    }),
    // new HtmlWebpackPlugin({
    //   filename: config.build.index,
    //   template: 'index.html',
    //   inject: true,
    //   minify: {
    //     removeComments: false,
    //     collapseWhitespace: false,
    //     removeAttributeQuotes: false
    //     // more options:
    //     // https://github.com/kangax/html-minifier#options-quick-reference
    //   },
    //   // necessary to consistently work with multiple chunks via CommonsChunkPlugin
    //   chunksSortMode: 'dependency'
    // }),
    ...filePath.htmls,
    new ProgressBarPlugin({
      format: '  打包中 [:bar] ' + chalk.green.bold(':percent'),  //+ ' (:elapsed 秒)',
      complete: '=',
      incomplete: ' ',
      clear: false,
      summary: false
    })
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        common: {
          name: 'common',
          chunks: 'initial',
          minSize:0,      //代码最小多大，进行抽离
          minChunks:2,    //代码复 2 次以上的抽离
        },
      },
    },
    // minimizer: [new UglifyJsPlugin({
    //   sourceMap: config.build.productionSourceMap,
    //   parallel: true
    // })],
  }
})

module.exports = webpackConfig