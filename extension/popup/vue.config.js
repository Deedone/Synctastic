module.exports = {
  publicPath: './',
  configureWebpack: {
    entry: './src/main.ts',
    module: {
      rules: [
         {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          appendTsSuffixTo: [/\.vue$/],
        }
      },
      ]
    }
  },
};