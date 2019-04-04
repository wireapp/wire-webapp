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

import S3 from 'aws-sdk/clients/s3';
import fs from 'fs-extra';
import path from 'path';
import {FindResult, find} from './deploy-utils';

interface S3Options {
  accessKeyId: string;
  bucket: string;
  secretAccessKey: string;
}

interface DeleteOptions extends S3Options {
  s3Path: string;
}

interface S3UploadOptions extends S3Options {
  filePath: string;
  s3Path: string;
}

interface S3CopyOptions extends S3Options {
  s3FromPath: string;
  s3ToPath: string;
}

async function findUploadFiles(platform: string, basePath: string, version: string): Promise<FindResult[]> {
  if (platform.includes('linux')) {
    const appImage = await find('*.AppImage', {cwd: basePath});
    const debImage = await find('*.deb', {cwd: basePath});
    const repositoryFiles = [
      `debian/pool/main/${debImage.fileName}`,
      'debian/dists/stable/Contents-amd64',
      'debian/dists/stable/Contents-amd64.bz2',
      'debian/dists/stable/Contents-amd64.gz',
      'debian/dists/stable/InRelease',
      'debian/dists/stable/Release',
      'debian/dists/stable/Release.gpg',
      'debian/dists/stable/main/binary-amd64/Packages',
      'debian/dists/stable/main/binary-amd64/Packages.bz2',
      'debian/dists/stable/main/binary-amd64/Packages.gz',
    ].map(fileName => ({fileName, filePath: path.join(basePath, fileName)}));

    return [...repositoryFiles, appImage, debImage];
  } else if (platform.includes('windows')) {
    const setupExe = await find('*-Setup.exe', {cwd: basePath});
    const nupkgFile = await find('*-full.nupkg', {cwd: basePath});
    const releasesFile = await find('RELEASES', {cwd: basePath});

    const [, appShortName] = new RegExp('(.+)-[\\d.]+-full\\.nupkg').exec(nupkgFile.fileName) || ['', ''];

    if (!appShortName) {
      throw new Error('App short name not found');
    }

    const setupExeRenamed = {...setupExe, fileName: `${appShortName}-${version}.exe`};
    const releasesRenamed = {...releasesFile, fileName: `${appShortName}-${version}-RELEASES`};

    return [nupkgFile, releasesRenamed, setupExeRenamed];
  } else if (platform.includes('macos')) {
    const setupPkg = await find('*.pkg', {cwd: basePath});
    return [setupPkg];
  } else {
    throw new Error(`Invalid platform "${platform}"`);
  }
}

async function uploadToS3(uploadOptions: S3UploadOptions): Promise<void> {
  const {accessKeyId, secretAccessKey, bucket, filePath, s3Path} = uploadOptions;

  const lstat = await fs.lstat(filePath);

  if (!lstat.isFile()) {
    throw new Error(`File "${filePath} not found`);
  }

  const file = fs.createReadStream(filePath);

  await new S3({
    accessKeyId,
    secretAccessKey,
  })
    .upload({
      ACL: 'public-read',
      Body: file,
      Bucket: bucket,
      Key: s3Path,
    })
    .promise();
}

async function deleteFromS3(deleteOptions: DeleteOptions): Promise<void> {
  const {accessKeyId, secretAccessKey, bucket, s3Path} = deleteOptions;

  await new S3({
    accessKeyId,
    secretAccessKey,
  })
    .deleteObject({
      Bucket: bucket,
      Key: s3Path,
    })
    .promise();
}

async function copyOnS3(copyOptions: S3CopyOptions): Promise<void> {
  const {accessKeyId, secretAccessKey, bucket, s3FromPath, s3ToPath} = copyOptions;

  await new S3({
    accessKeyId,
    secretAccessKey,
  })
    .copyObject({
      ACL: 'public-read',
      Bucket: bucket,
      CopySource: s3FromPath,
      Key: s3ToPath,
    })
    .promise();
}

export {copyOnS3, deleteFromS3, findUploadFiles, uploadToS3, DeleteOptions, S3UploadOptions, S3CopyOptions};
