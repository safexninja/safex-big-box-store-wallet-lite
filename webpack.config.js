const path = require('path')

const bundle = {
  mode: 'development',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
 
  module: {
    rules: [
      { test: /\.css$/, use: 'css-loader' },
      { test: /\.ts$/, use: 'ts-loader' },
      { test: /\.js$/, use: 'source-map-loader' }
    ]
  },

  entry: 
    [
      './src/app/public/js/menu.ts',
      './src/app/public/js/store.ts',
      './src/app/public/js/market.ts',
      './src/app/public/js/wallets.ts',
      './src/app/public/js/websocket.ts',
      './src/app/public/js/modals.ts',
      './src/app/public/js/listings.ts',
      './src/app/public/js/settings.ts',
      './src/app/public/js/managing.ts',
      './src/app/public/js/purchases.ts',
      './src/app/public/js/orders.ts',
      './src/app/public/js/logs.ts',
      './src/app/public/js/index.ts',
      './node_modules/bootstrap/dist/js/bootstrap.esm.js'
  ]
  ,
  output: {
    path: path.resolve(__dirname, 'build/app/public/js'),
    filename: 'bundle.js'
  },
  devtool: false,
}


const login = {
  mode: 'development',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
 
  module: {
    rules: [
      { test: /\.css$/, use: 'css-loader' },
      { test: /\.ts$/, use: 'ts-loader' },
      { test: /\.js$/, use: 'source-map-loader' }
    ]
  },

  entry: 
    [
      './src/app/public/js/login.ts',
      './src/app/public/js/createUser.ts',
      './node_modules/bootstrap/dist/js/bootstrap.esm.js'
  ]
  ,
  output: {
    path: path.resolve(__dirname, 'build/app/public/js'),
    filename: 'login.js'
  },
  devtool: false,
}

module.exports = [bundle, login]