const pkg = require('./package.json');
const path = require('path');

const source = path.join(pkg.name, 'content');
const repositoryUrl = pkg.dependencies['wire-web-config-default'];

module.exports = {
  files: {
    [`${source}/**`]: 'resource/',
  },
  repositoryUrl,
}
