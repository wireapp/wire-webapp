module.exports = {
  entry: {
    'sdp-transform': `${__dirname}/node_modules/sdp-transform/lib/index.js`,
  },
  output: {
    filename: '[name].bundle.js',
    library: 'sdpTransform',
    path: `${__dirname}/app/ext/js/sdp-transform`,
  },
};
