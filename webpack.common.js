const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    main: './src/resources/js/main_online.js',
    ko: './src/ko/ko.js',
    main_replay: './src/resources/js/replay/main_replay.js',
  },
  output: {
    filename: '[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: { name: 'runtime' }, // this is for code-sharing between "main_online.js" and "ko.js"
    splitChunks: {
      chunks: 'all',
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          context: 'src/',
          from: 'resources/assets/**/*.+(json|png|mp3|wav)',
        },
        { from: 'src/index.html', to: 'index.html' },
        {
          from: 'src/en/update-history/index.html',
          to: 'en/update-history/index.html',
        },
        {
          from: 'src/ko/update-history/index.html',
          to: 'ko/update-history/index.html',
        },
        {
          from: 'src/resources/style.css',
          to: 'resources/style.css',
        },
      ],
    }),
    new MiniCssExtractPlugin({
      chunkFilename: '[name].[contenthash].css',
    }),
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
    new HtmlWebpackPlugin({
      template: 'src/en/replay/index.html',
      filename: 'en/replay/index.html',
      chunks: ['runtime', 'main_replay'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: 'src/ko/replay/index.html',
      filename: 'ko/replay/index.html',
      chunks: ['runtime', 'ko', 'main_replay'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
  ],
};
