import fs from 'fs-extra';
import Changelog from 'generate-changelog';
import path from 'path';
import simpleGit from 'simple-git';
import * as pkg from '../package.json';

const args = process.argv.slice(2);
const branchName = args[0];

/**
 * This script generates a nicely-formatted changelog based on commit messages. By default it includes all commits between the current and the previous production release (indicated by their "-production" Git tag suffix).
 *
 * You can also pass an argument to this script to get all release items between the latest production tag and a given branch (i.e. "dev" or "master"). This is very useful if you want to create an upcoming changelog for a custom build and/or RC build:
 * Example: ts-node ./bin/changelog.ts master
 *
 * This script assumes that all commit messages follow the syntax of "Semantic Commit Messages":
 * https://sparkbox.com/foundry/semantic_commit_messages
 *
 * This script is based on:
 * https://github.com/lob/generate-changelog
 */
void (async () => {
  const tags = await simpleGit().tags({'--list': null});
  const outputPath = path.join(__dirname, '../CHANGELOG.md');
  const productionTags = tags.all.filter(tag => tag.includes('-production.'));

  const newProductionTag = productionTags.sort().reverse()[0];
  const lastProductionTag = productionTags.sort().reverse()[1];

  const from = branchName ? newProductionTag : lastProductionTag;
  const to = branchName ? branchName : newProductionTag;

  console.info(`Generating changelog with commits from "${from}" to "${to}".`);

  try {
    const changelog = await Changelog.generate({
      exclude: ['chore', 'docs', 'refactor', 'style', 'test'],
      repoUrl: pkg.repository.url.replace('.git', ''),
      tag: `${from}...${to}`,
    });
    fs.outputFileSync(outputPath, changelog, 'utf8');
    console.info(`Wrote file to: ${outputPath}`);
  } catch (error) {
    console.warn(`Could not generate changelog from "${from}" to "${to}": ${error.message}`, error);
  }
})();
