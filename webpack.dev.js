const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
  },
  entry: {
    main: './src/resources/js/main_online.js',
    ko: './src/ko/ko.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: { name: 'runtime' }, // this is for code-sharing between "main.js and "ko.js"
    splitChunks: {
      chunks: 'all',
    },
  },
  plugins: [
    new CopyPlugin([
      {
        context: 'src/',
        from: 'resources/assets/**/*.+(json|png|mp3|wav)',
      },
      { from: 'src/resources/style.css', to: 'resources/style.css' },
      { from: 'src/index.html', to: 'index.html' },
    ]),
    new HtmlWebpackPlugin({
      template: 'src/en/index.html',
      filename: 'en/index.html',
      chunks: ['runtime', 'main'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: 'src/ko/index.html',
      filename: 'ko/index.html',
      chunks: ['runtime', 'ko', 'main'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
  ],
};
