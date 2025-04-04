/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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
 *
 */

import {S3Client, S3ServiceException} from '@aws-sdk/client-s3';
import {Upload} from '@aws-sdk/lib-storage';

import {CellsStorage, CellsStorageError} from './CellsStorage';

interface S3ServiceConfig {
  apiKey: string;
  bucket: string;
  endpoint: string;
  region: string;
}

export const MAX_QUEUE_SIZE = 3;
export const PART_SIZE = 10 * 1024 * 1024; // 10MB

export class S3Service implements CellsStorage {
  private client: S3Client;
  private bucket: string;

  constructor({apiKey, bucket, endpoint, region}: S3ServiceConfig) {
    this.bucket = bucket;

    this.client = new S3Client({
      endpoint,
      forcePathStyle: true,
      region,
      credentials: async () => ({
        accessKeyId: apiKey,
        secretAccessKey: 'gatewaysecret',
      }),
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  async putObject({
    path,
    file,
    metadata,
    progressCallback,
    abortController,
  }: {
    path: string;
    file: File;
    metadata?: Record<string, string>;
    progressCallback?: (progress: number) => void;
    abortController?: AbortController;
  }): Promise<void> {
    const upload = new Upload({
      client: this.client,
      partSize: PART_SIZE,
      queueSize: MAX_QUEUE_SIZE,
      leavePartsOnError: false,
      params: {
        Bucket: this.bucket,
        Body: file,
        Key: path,
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: metadata,
      },
      abortController,
    });

    if (progressCallback) {
      upload.on('httpUploadProgress', progress => {
        if (!progress?.loaded || !progress?.total) {
          return;
        }
        progressCallback(progress.loaded / progress.total);
      });
    }

    try {
      await upload.done();
    } catch (caught) {
      if (caught instanceof S3ServiceException && caught.name === 'EntityTooLarge') {
        throw new CellsStorageError(
          'The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) or the multipart upload API (5TB max).',
          caught,
        );
      } else if (caught instanceof S3ServiceException) {
        throw new CellsStorageError(
          `Error from S3 while uploading object to ${this.bucket}. ${caught.name}: ${caught.message}`,
          caught,
        );
      }
      throw caught;
    }
  }
}
