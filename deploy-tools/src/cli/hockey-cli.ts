/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 */

import commander from 'commander';
import fs from 'fs-extra';
import path from 'path';

import {FindResult, checkCommanderOptions, find} from '../lib/deploy-utils';
import {createVersion, uploadVersion, zip} from '../lib/hockey';

commander
  .name('hockey.js')
  .description('Upload files to Hockey')
  .option('-i, --hockey-id <id>', 'Specify the Hockey app ID')
  .option('-t, --hockey-token <token>', 'Specify the Hockey API token')
  .option('-w, --wrapper-build <build>', 'Specify the wrapper build (e.g. "Linux#3.7.1234")')
  .option('-p, --path <path>', 'Specify the local path to search for files (e.g. "../../wrap")')
  .parse(process.argv);

checkCommanderOptions(commander, ['hockeyToken', 'hockeyId', 'wrapperBuild']);

if (!commander.wrapperBuild.includes('#')) {
  commander.outputHelp();
  process.exit(1);
}

function getUploadFile(platform: string, basePath: string): Promise<FindResult> {
  if (platform.includes('linux')) {
    return find('*.deb', {cwd: basePath});
  } else if (platform.includes('windows')) {
    return find('*-Setup.exe', {cwd: basePath});
  } else if (platform.includes('macos')) {
    return find('*.pkg', {cwd: basePath});
  } else {
    throw new Error(`Invalid platform "${platform}"`);
  }
}

(async () => {
  const {hockeyId, hockeyToken, wrapperBuild} = commander;
  const [platform, version] = wrapperBuild.toLowerCase().split('#');
  const searchBasePath = commander.path || path.resolve('.');
  const [majorVersion, minorVersion] = version.split('.');

  const {filePath} = await getUploadFile(platform, searchBasePath);

  console.log(`Compressing "${filePath} ..."`);

  const zipFile = await zip(filePath, filePath.replace(/\.([^.]+)$/, '.zip'));

  console.log(`Creating app version "${majorVersion}.${minorVersion}" on Hockey ...`);

  const {id: hockeyVersionId} = await createVersion({
    hockeyAppId: hockeyId,
    hockeyToken,
    version,
  });

  console.log(`Received version "${hockeyVersionId}" from Hockey.`);

  console.log(`Uploading version "${hockeyVersionId}" to Hockey ...`);

  await uploadVersion({
    filePath: zipFile,
    hockeyAppId: hockeyId,
    hockeyToken,
    hockeyVersionId,
    version,
  });

  await fs.remove(zipFile);

  console.log('Done uploading to Hockey.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
