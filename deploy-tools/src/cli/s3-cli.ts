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

import {checkCommanderOptions} from '../lib/deploy-utils';
import {findUploadFiles, uploadToS3} from '../lib/s3';

commander
  .name('s3.js')
  .description('Upload files to S3')
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
  const searchBasePath = commander.path || path.join(__dirname, '../../wrap');
  const s3BasePath = `${commander.s3path || ''}/`;
  const [platform, version] = commander.wrapperBuild.toLowerCase().split('#');
  const {bucket, secretKey, keyId} = commander;

  const files = await findUploadFiles(platform, searchBasePath, version);

  for (const file of files) {
    const {fileName, filePath} = file;
    const s3Path = `${s3BasePath}${fileName}`.replace('//', '/');

    console.log(`Uploading "${fileName}" to "${bucket}/${s3Path}" ...`);
    await uploadToS3({
      accessKeyId: keyId,
      bucket,
      filePath,
      s3Path,
      secretAccessKey: secretKey,
    });
  }

  console.log('Done uploading to S3.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
