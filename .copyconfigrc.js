const pkg = require('./package.json');
const path = require('path');

const source = path.join(pkg.name, 'content');
const repositoryUrl = pkg.dependencies['wire-web-config-default'];

module.exports = {
  files: {
    [`${source}/**`]: 'resource/',
    [path.join(pkg.name, '.env')]: path.join(__dirname, '.env'),
  },
  repositoryUrl,
};
