import {generate} from 'generate-changelog';
import {simpleGit} from 'simple-git';

// Use require for JSON to avoid ts-node config issues
const pkg = require('../package.json');

const args = process.argv.slice(2);
const releaseType = args[0];
const until = args[1];

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
  const productionTags = tags.all.filter(tag => tag.includes(`-${releaseType}.`));

  const newProductionTag = productionTags.sort().reverse()[0];
  const lastProductionTag = productionTags.sort().reverse()[1];

  const from = until ? newProductionTag : lastProductionTag;
  const to = until ? until : newProductionTag;

  try {
    const changelog = await generate({
      exclude: ['chore', 'docs', 'refactor', 'style', 'test', 'runfix'],
      repoUrl: pkg.repository.url.replace('.git', ''),
      tag: `${from}...${to}`,
    });
    console.log(changelog);
  } catch (error: any) {
    console.warn(`Could not generate changelog from "${from}" to "${to}": ${error.message}`, error);
  }
})();
