'use strict'
const path = require('path')
const utils = require('./utils')
const config = require('../config')
const filePath = require('./files')

function resolve(dir) {
  return path.join(__dirname, '..', dir)
}

let webpackBaseConfig = {
  mode: 'none',
  context: path.resolve(__dirname, '../'),
  entry: filePath.entrys,
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production' ?
      config.build.assetsPublicPath :
      config.dev.assetsPubicPath
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@': resolve('pages'),
    }
  },
  module: {
    rules: [{
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
        }],
        include: [
          resolve('pages'),
          path.join(__dirname, '..')
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            esModule: false,
            limit: 10000,
            name: utils.assetsPath('[path][name].[hash:7].[ext]')
          }
        }]
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: utils.assetsPath('[path][name].[hash:7].[ext]')
          }
        }]
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: utils.assetsPath('[path][name].[hash:7].[ext]')
          }
        }]
      },
      {
        test: /\.(htm|html)$/i,
        use: [
          {
            loader: 'html-loader',
            options: {
              removeComments: false,
              collapseWhitespace: false,
              minimize: false,
              interpolate: true,
              attrs: ['img:src']
            }
          }
        ]
      }
    ]
  }
}

module.exports = webpackBaseConfig