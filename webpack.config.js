const path = require('path');
const miniCss = require('mini-css-extract-plugin');

module.exports = {
    mode: 'development',
    entry: {
        bundle:
            ['./node_modules/bootstrap/dist/css/bootstrap.min.css',
             './node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
             './node_modules/@fortawesome/fontawesome-free/css/all.min.css',
             './styles.css']
    },
    output: {
        path: path.resolve('dist')
    },
    plugins: [new miniCss()],
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
                            name: '../dist/webfonts/[name].[ext]'
                        },
                    },
                ],
            }
        ]
    },
};
