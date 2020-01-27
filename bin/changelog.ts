import fs from 'fs';
import Changelog from 'generate-changelog';
import * as pkg from '../package.json';

const simpleGit = require('simple-git')();

const options: {} = {'--list': null};
simpleGit.pull().tags(
  options,
  async (
    error: Error,
    tags: {
      all: string[];
    },
  ) => {
    const productionTags = tags.all.filter(tag => tag.includes('-production.'));
    const latestProductionTag = productionTags.sort().reverse()[0];
    const changelog = await Changelog.generate({
      exclude: ['chore', 'docs', 'refactor', 'style', 'test'],
      repoUrl: pkg.repository.url.replace('.git', ''),
      tag: `${latestProductionTag}...master`,
    });
    fs.writeFileSync('../CHANGELOG.md', changelog);
  },
);
