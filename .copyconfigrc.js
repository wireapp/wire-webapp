const pkg = require('./package.json');
const appConfigPkg = require('./app-config/package.json');
const {execSync} = require('child_process');

/**
 * Selects the configuration by precedence:
 * 1. distribution (other than 'wire')
 * 2. branch (one of 'master', 'staging', 'dev')
 * 3. tagged commit
 * 4. default
 *
 * Scenarios:
 * 1. When executed locally the current commit can be the HEAD of a branch (master, staging, dev) AND a tag. The branch has precedence here.
 * 2. When executed on CI it is either a tagged commit OR a branch.
 */
const selectConfiguration = () => {
  const distribution = process.env.DISTRIBUTION !== 'wire' && process.env.DISTRIBUTION;
  if (distribution) {
    console.log(`Selecting configuration "${distribution}" (reason: custom distribution)`);
    return distribution;
  }
  let currentBranch = '';
  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();
  } catch (error) {}
  switch (currentBranch) {
    case 'master':
    case 'staging': {
      console.log(`Selecting configuration "${currentBranch}" (reason: branch)`);
      return currentBranch;
    }
    case 'dev': {
      console.log(`Selecting configuration "staging" (reason: branch)`);
      return 'staging';
    }
    default: {
      let isTaggedCommit = false;
      try {
        isTaggedCommit = !!execSync('git tag -l --points-at HEAD')
          .toString()
          .trim();
      } catch (error) {}
      if (isTaggedCommit) {
        console.log('Selecting configuration "master" (reason: tagged commit)');
        return 'master';
      }
      console.log('Selecting configuration "staging" (reason: default)');
      return 'staging';
    }
  }
};

const configurationEntry = `wire-web-config-default-${selectConfiguration()}`;
const repositoryUrl = appConfigPkg.dependencies[configurationEntry];

console.log('repo url', repositoryUrl);

module.exports = {
  files: {
    [`${pkg.name}/content/**`]: 'resource/',
    [`${pkg.name}/.env.defaults`]: `${__dirname}/.env.defaults`,
  },
  repositoryUrl,
};
