const path = require('path');
const miniCss = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        main: './src/main.js',
        best_prices: './src/best_prices.js',
        trend_trading: './src/trend_trading.js',
        bundle:
            [
                './node_modules/bootstrap/dist/css/bootstrap.min.css',
                './node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
                './node_modules/@fortawesome/fontawesome-free/css/all.min.css',
                './styles.css'
            ]
    },
    output: {
        filename: '[name].js',
        path: path.resolve('dist')
    },
    plugins: [
        new miniCss(),
        new HtmlWebpackPlugin(
            {
                template: './index.html',
                favicon: 'images/favicon.ico'
            }),
        new HtmlWebpackPlugin(
            {
                template: './best_prices.html',
                favicon: 'images/favicon.ico',
                filename: 'best_prices.html',
                chunks: ['best_prices']
            }),
        new HtmlWebpackPlugin(
            {
                template: './trend_trading.html',
                favicon: 'images/favicon.ico',
                filename: 'trend_trading.html',
                chunks: ['trend_trading']
            })
    ],
    module: {
        rules: [
            {
                test: /\.(s*)css$/i,
                use: [
                    miniCss.loader,
                    'css-loader'
                ],
            },
            {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: '8192',
                            name: '[name].[ext]',
                            outputPath: 'webfonts'
                        },
                    },
                ],
            }
        ]
    },
};
