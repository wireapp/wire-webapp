#!/usr/bin/env node

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
import path from 'path';

import {checkCommanderOptions, find} from '../lib/deploy-utils';
import {copyOnS3, deleteFromS3} from '../lib/s3';

commander
  .name('s3-win-releases.js')
  .description('Copy releases files on S3')
  .option('-b, --bucket <bucket>', 'Specify the S3 bucket to upload to')
  .option('-w, --wrapper-build <build>', 'Specify the wrapper build (e.g. "Linux#3.7.1234")')
  .option('-s, --s3path <s3path>', 'Specify the base path on S3 (e.g. "apps/windows")')
  .option('-p, --path <path>', 'Specify the local path to search for files (e.g. "../../wrap")')
  .option('-i, --key-id <path>', 'Specify the AWS access key ID')
  .option('-k, --secret-key <path>', 'Specify the AWS secret access key ID')
  .parse(process.argv);

checkCommanderOptions(commander, ['bucket', 'keyId', 'secretKey', 'wrapperBuild']);

if (!commander.wrapperBuild.includes('#')) {
  commander.outputHelp();
  process.exit(1);
}

(async () => {
  const [platform, version] = commander.wrapperBuild.toLowerCase().split('#');

  if (platform !== 'windows') {
    throw new Error('Copying release files on S3 is supported only for Windows');
  }

  const bucket = commander.bucket;
  const searchBasePath = commander.path || path.resolve('.');
  const s3BasePath = `${commander.s3path || ''}/`.replace('//', '/');

  const nupkgFile = await find('*-full.nupkg', {cwd: searchBasePath});
  const setupExe = await find('*-Setup.exe', {cwd: searchBasePath});
  const [, appShortName] = new RegExp('(.+)-[\\d.]+-full\\.nupkg').exec(nupkgFile.fileName) || ['', ''];
  const [, appFullName] = new RegExp('(.+)-Setup\\.exe').exec(setupExe.fileName) || ['', ''];

  if (!appShortName) {
    throw new Error('App short name not found');
  }

  if (!appFullName) {
    throw new Error('App full name not found');
  }

  const staticReleaseKey = `${s3BasePath}/RELEASES`;
  const staticExeKey = `${s3BasePath}/${appFullName}-Setup.exe`;

  const latestReleaseKey = `${s3BasePath}/${appShortName}-${version}-RELEASES`;
  const latestExeKey = `${s3BasePath}/${appShortName}-${version}.exe`;

  const secretAccessKey = commander.secretKey;
  const accessKeyId = commander.keyId;

  console.log(`Deleting "${staticReleaseKey}" from S3 ...`);
  await deleteFromS3({accessKeyId, bucket, secretAccessKey, s3Path: staticReleaseKey});

  console.log(`Deleting "${staticExeKey}" from S3 ...`);
  await deleteFromS3({accessKeyId, bucket, secretAccessKey, s3Path: staticExeKey});

  console.log(`Copying "${bucket}/${latestReleaseKey}" to "${staticReleaseKey}" on S3 ...`);
  await copyOnS3({
    accessKeyId,
    bucket,
    s3FromPath: `${bucket}/${latestReleaseKey}`,
    s3ToPath: staticReleaseKey,
    secretAccessKey,
  });

  console.log(`Copying "${bucket}/${latestExeKey}" to "${staticExeKey}" on S3 ...`);
  await copyOnS3({
    accessKeyId,
    bucket,
    s3FromPath: `${bucket}/${latestExeKey}`,
    s3ToPath: staticExeKey,
    secretAccessKey,
  });

  console.log('Done updating releases on S3.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
