'use strict'

const path = require('path')

let config = {
  // Name of electron app
  // Will be used in production builds
  name: 'WedPlayer',

  // Use ESLint (extends `airbnb`)
  // Further changes can be made in `.eslintrc.js`
  eslint: true,

  // webpack-dev-server port
  port: 9080,

  // electron-packager options
  // Docs: https://simulatedgreg.gitbooks.io/electron-vue/content/en/building_your_app.html
  building: {
    arch: process.env.PLATFORM_TARGET === 'win32' ? 'ia32' : 'x64',
    appCopyright: 'Copyright © 2017 小影志\n保留一切权利。',
    asar: true,
    dir: path.join(__dirname, 'app'),
    icon: path.join(__dirname, 'app/icons/icon'),
    ignore: /^\/(src|index\.ejs|icons)/,
    out: path.join(__dirname, 'builds'),
    overwrite: true,
    platform: process.env.PLATFORM_TARGET || 'all'
  }
}

config.building.name = config.name

module.exports = config
