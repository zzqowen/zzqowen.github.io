'use strict'

process.env.NODE_ENV = 'production'

const ora = require('ora')
const rm = require('rimraf')
const chalk = require('chalk')
const config = require('../config')
const ProgressPlugin = require('webpack/lib/ProgressPlugin')
const path = require('path')
const webpack = require('webpack')
const webpackConfig = require('./webpack.prod.conf')

// const spinner = new ora({
//   discardStdin: false,
//   text: '打包中....',
//   color: 'red',
//   spinner: 'monkey'
// });
// spinner.start()

rm(path.join(config.build.assetsRoot), function (err) {
  if (err) throw err

  const compiler = webpack(webpackConfig)

  // 实现--progress 效果
  // compiler.apply(new ProgressPlugin(function (percentage, msg, current, active, modulepath) {
  //   if (process.stdout.isTTY && percentage < 1) {
  //     process.stdout.cursorTo(0)
  //     modulepath = modulepath ? ' …' + modulepath.substr(modulepath.length - 30) : ''
  //     current = current ? ' ' + current : ''
  //     active = active ? ' ' + active : ''
  //     process.stdout.write((percentage * 100).toFixed(0) + '% ' + msg + current + active + modulepath + ' ')
  //     process.stdout.clearLine(1)
  //   } else if (percentage === 1) {
  //     process.stdout.write('\n')
  //     // console.log('webpack: done.')
  //   }
  // }))

  compiler.run(function(err, stats) {
    // spinner.stop()
    if (err) throw err
    process.stdout.write(stats.toString({
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }) + '\n\n')

    if (stats.hasErrors()) {
      console.log(chalk.red('  打包失败 \n'))
      process.exit(1)
    }

    console.log(chalk.green('  打包完成 \n'))
  });
})