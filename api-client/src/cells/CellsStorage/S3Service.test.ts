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

import {PutObjectCommand, S3Client, S3ServiceException} from '@aws-sdk/client-s3';

import {CellsStorageError} from './CellsStorage';
import {S3Service} from './S3Service';

jest.mock('@aws-sdk/client-s3');

describe('S3Service', () => {
  let service: S3Service;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSend = jest.fn().mockResolvedValue({});
    const mockS3Client = {
      send: mockSend,
    } as unknown as jest.Mocked<S3Client>;

    (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

    service = new S3Service(testConfig);
  });

  it('creates an S3Client with the correct configuration', () => {
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: testConfig.endpoint,
        forcePathStyle: true,
        region: testConfig.region,
        requestChecksumCalculation: 'WHEN_REQUIRED',
      }),
    );
  });

  describe('putObject', () => {
    it('creates a PutObjectCommand with the correct parameters', async () => {
      await service.putObject({path: testFilePath, file: testFile});

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: testConfig.bucket,
        Body: testFile,
        Key: testFilePath,
        ContentType: testFile.type,
        ContentLength: testFile.size,
        Metadata: undefined,
      });
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('includes metadata when provided', async () => {
      const metadata = {
        'test-key': 'test-value',
        'another-key': 'another-value',
      };

      await service.putObject({path: testFilePath, file: testFile, metadata});

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Metadata: metadata,
        }),
      );
    });

    it('handles EntityTooLarge errors with a specific error message', async () => {
      const error = createS3Error('EntityTooLarge', 'Entity too large');

      mockSend.mockRejectedValueOnce(error);

      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(CellsStorageError);

      mockSend.mockRejectedValueOnce(error);
      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(/The object was too large/);
    });

    it('handles other S3ServiceExceptions with a generic error message', async () => {
      const errorName = 'OtherError';
      const errorMessage = 'Some other error';
      const error = createS3Error(errorName, errorMessage);

      mockSend.mockRejectedValueOnce(error);

      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(CellsStorageError);

      mockSend.mockRejectedValueOnce(error);
      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(
        new RegExp(`Error from S3 while uploading object to.*${errorName}: ${errorMessage}`),
      );
    });

    it('passes through other types of errors without wrapping them', async () => {
      const error = new Error('Unexpected error');
      mockSend.mockRejectedValueOnce(error);

      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toBe(error);
    });
  });
});

class MockBlob {
  size: number = 0;
  type: string = '';
  slice = jest.fn().mockReturnThis();
  arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
  text = jest.fn().mockResolvedValue('');
  stream = jest.fn().mockReturnValue({locked: false, getReader: jest.fn()});
}

class MockFile {
  name: string;
  type: string;
  size: number;
  content: string;
  lastModified = Date.now();
  webkitRelativePath = '';

  constructor(content: string[], name: string, options?: {type: string}) {
    this.content = content.join('');
    this.name = name;
    this.type = options?.type || '';
    this.size = this.content.length;
  }

  arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
  slice = jest.fn().mockReturnValue(new MockBlob());
  stream = jest.fn().mockReturnValue({locked: false, getReader: jest.fn()});
  text = jest.fn().mockImplementation(() => Promise.resolve(this.content));
}

const createS3Error = (name: string, message: string): S3ServiceException => {
  const error = new S3ServiceException({
    name,
    $metadata: {},
    message,
    $fault: 'client',
  });

  Object.defineProperties(error, {
    name: {value: name, enumerable: true},
    message: {value: message, enumerable: true},
  });

  return error;
};

const File = global.File || MockFile;

const testConfig = {
  apiKey: 'test-api-key',
  bucket: 'test-bucket',
  endpoint: 'test-endpoint',
  region: 'test-region',
};

const testFilePath = '/test/path/file.txt';
const testFileContent = 'test file content';
const testFileType = 'text/plain';
const testFile = new File([testFileContent], 'file.txt', {type: testFileType});
