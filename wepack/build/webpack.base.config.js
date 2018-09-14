const path = require('path');
const config = require('../config');
const webpack = require('webpack');

function resolve(dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  context: path.resolve(__dirname, '../'),
  entry: {
    index: './src/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].js',
    publicPath: process.env.NODE_ENV === 'production' ?
      config.build.assetsPublicPath : config.dev.assetsPublicPath
  },
  mode: 'development',
  module: {
    rules: [{
        test: /\.js$/,
        use: [{
          loader: 'babel-loader'
        }],
        include: [resolve('src')],
        exclude: '/node_modules/'
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      }
    ]
  },
  plugins: [

  ]
}