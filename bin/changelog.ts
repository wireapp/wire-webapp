import fs from 'fs-extra';
import Changelog from 'generate-changelog';
import path from 'path';
import simpleGit from 'simple-git';
import * as pkg from '../package.json';

const args = process.argv.slice(2);
const branchName = args[0];

void (async () => {
  const tags = await simpleGit().tags({'--list': null});
  const outputPath = path.join(__dirname, '../CHANGELOG.md');
  const productionTags = tags.all.filter(tag => tag.includes('-production.'));

  const newProductionTag = productionTags.sort().reverse()[0];
  const lastProductionTag = productionTags.sort().reverse()[1];

  const from = branchName ? newProductionTag : lastProductionTag;
  const to = branchName ? branchName : newProductionTag;

  const changelog = await Changelog.generate({
    exclude: ['chore', 'docs', 'refactor', 'style', 'test'],
    repoUrl: pkg.repository.url.replace('.git', ''),
    tag: `${from}...${to}`,
  });

  console.info(`Generating changelog with commits from "${from}" to "${to}".`);
  fs.outputFileSync(outputPath, changelog, 'utf8');
  console.info(`Wrote file to: ${outputPath}`);
})();
