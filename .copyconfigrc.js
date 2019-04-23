const pkg = require('./package.json');
const {execSync} = require('child_process');
const path = require('path');

const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
  .toString()
  .trim();
const configurationEntry = `wire-web-config-default-${currentBranch === 'prod' ? 'prod' : 'staging'}`;
const repositoryUrl = pkg.dependencies[configurationEntry];

module.exports = {
  files: {
    [`${pkg.name}/content/**`]: 'resource/',
    [`${pkg.name}/.env.defaults`]: `${__dirname}/.env.defaults`,
  },
  repositoryUrl,
};
