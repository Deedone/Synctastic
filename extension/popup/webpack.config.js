var path = require('path');
var webpack = require('webpack');
const { VueLoaderPlugin } = require('vue-loader')
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: "./src/main.ts",
    mode: "development",
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'build.js',
        publicPath: './',
      },

      module: {
        rules: [
          {
            test: /\.vue$/,
            loader: 'vue-loader',
            options: {
              loaders: {
                // Since sass-loader (weirdly) has SCSS as its default parse mode, we map
                // the "scss" and "sass" values for the lang attribute to the right configs here.
                // other preprocessors should work out of the box, no loader config like this necessary.
                css: 'vue-style-loader!css-loader',
                sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax'
              }
              // other vue-loader options go here
            }
          },
          {
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/
          },
          {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
            options: {
              appendTsSuffixTo: [/\.vue$/],
            }
          },
        ]
    },
    resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      vue$: 'vue/dist/vue.esm.js'
    }
  },
  devtool: 'source-map',
  plugins:[
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template:"./index.html"
    })
  ]
    

}