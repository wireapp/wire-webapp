const pkg = require('./package.json');
const appConfigPkg = require('./app-config/package.json');
const {execSync} = require('child_process');
const path = require('path');

const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
  .toString()
  .trim();
const isTagged = !!execSync('git tag -l --points-at HEAD')
  .toString()
  .trim();
const configBranchSelection = isTagged || currentBranch === 'master' ? 'master' : 'staging';
const distribution = process.env.DISTRIBUTION !== 'wire' && process.env.DISTRIBUTION;
const suffix = distribution || configBranchSelection;
const configurationEntry = `wire-web-config-default-${suffix}`;
const repositoryUrl = appConfigPkg.dependencies[configurationEntry];

console.log('repo url', repositoryUrl, suffix);

module.exports = {
  files: {
    [`${pkg.name}/content/**`]: 'resource/',
    [`${pkg.name}/.env.defaults`]: `${__dirname}/.env.defaults`,
  },
  repositoryUrl,
};
