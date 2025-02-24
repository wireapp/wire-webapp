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

import {S3Client, PutObjectCommand, S3ServiceException} from '@aws-sdk/client-s3';
import {AwsCredentialIdentity} from '@smithy/types';

import {StorageService, StorageServiceError} from './StorageService';

export class S3Service implements StorageService {
  private client: S3Client;
  private bucketName: string;

  constructor({apiKey, s3URL, bucketName}: {apiKey: string; s3URL: string; bucketName: string}) {
    this.bucketName = bucketName;

    const provider = async (): Promise<AwsCredentialIdentity> => {
      return {
        accessKeyId: apiKey,
        secretAccessKey: 'gatewaysecret',
      };
    };

    this.client = new S3Client({
      endpoint: s3URL,
      forcePathStyle: true,
      region: 'us-east',
      credentials: provider,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  async putObject({
    filePath,
    file,
    metadata,
  }: {
    filePath: string;
    file: File;
    metadata?: Record<string, string>;
  }): Promise<void> {
    // console.log('Sending', nodeId, versionId);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Body: file,
      Key: filePath,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: metadata,
    });

    try {
      await this.client.send(command);
    } catch (caught) {
      if (caught instanceof S3ServiceException && caught.name === 'EntityTooLarge') {
        throw new StorageServiceError(
          'The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) or the multipart upload API (5TB max).',
          caught,
        );
      } else if (caught instanceof S3ServiceException) {
        throw new StorageServiceError(
          `Error from S3 while uploading object to ${this.bucketName}. ${caught.name}: ${caught.message}`,
          caught,
        );
      }
      throw caught;
    }
  }
}
