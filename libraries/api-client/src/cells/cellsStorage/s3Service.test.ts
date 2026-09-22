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
import {XhrHttpHandler} from '@aws-sdk/xhr-http-handler';

import {CellsStorageError} from './cellsStorage';
import {createAbortableXhrHttpHandler, MAX_QUEUE_SIZE, PART_SIZE, S3Service} from './s3Service';

import {AccessTokenStore} from '../../auth/accessTokenStore';

jest.mock('@aws-sdk/client-s3', () => {
  const actualS3Module = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actualS3Module,
    S3Client: jest.fn(),
  };
});
jest.mock('@aws-sdk/lib-storage');

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

    service = new S3Service({
      config: testConfig,
      accessTokenStore: {
        getAccessToken: jest.fn().mockReturnValue('test-access-token'),
        tokenExpirationDate: Date.now() + 1000,
      } as unknown as AccessTokenStore,
    });
  });

  it('creates an S3Client with the correct configuration', () => {
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: testConfig.endpoint,
        forcePathStyle: true,
        region: testConfig.region,
        requestHandler: expect.any(XhrHttpHandler),
        requestChecksumCalculation: 'WHEN_REQUIRED',
      }),
    );
  });

  it('passes the upload abort signal to the XHR handler', async () => {
    const abortController = new AbortController();
    const request = {} as never;
    const handle = jest.spyOn(XhrHttpHandler.prototype, 'handle').mockResolvedValue({response: {} as never});
    const requestHandler = createAbortableXhrHttpHandler(abortController.signal);

    await requestHandler.handle(request);

    expect(handle).toHaveBeenCalledWith(request, expect.objectContaining({abortSignal: abortController.signal}));
    handle.mockRestore();
  });

  it('rejects an XHR that completes without an HTTP response', async () => {
    const handle = jest
      .spyOn(XhrHttpHandler.prototype, 'handle')
      .mockResolvedValue({response: {statusCode: 0} as never});
    const requestHandler = createAbortableXhrHttpHandler(new AbortController().signal);

    try {
      await expect(requestHandler.handle({} as never)).rejects.toThrow(
        'XHR request failed before receiving an HTTP response',
      );
    } finally {
      handle.mockRestore();
    }
  });

  it('aborts the underlying XHR when the upload signal is cancelled', async () => {
    const abortController = new AbortController();
    const xhr = {
      upload: {addEventListener: jest.fn()},
      addEventListener: jest.fn(),
      open: jest.fn(),
      setRequestHeader: jest.fn(),
      send: jest.fn(),
      abort: jest.fn(),
    };
    const originalXMLHttpRequest = globalThis.XMLHttpRequest;
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      configurable: true,
      value: jest.fn(() => xhr),
      writable: true,
    });

    try {
      const requestHandler = createAbortableXhrHttpHandler(abortController.signal);
      const pending = requestHandler.handle({
        protocol: 'https:',
        hostname: 's3.example.test',
        path: '/bucket/object',
        method: 'PUT',
        headers: {},
        query: {},
      } as never);

      await Promise.resolve();
      abortController.abort();

      await expect(pending).rejects.toMatchObject({name: 'AbortError'});
      expect(xhr.abort).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, 'XMLHttpRequest', {
        configurable: true,
        value: originalXMLHttpRequest,
        writable: true,
      });
    }
  });

  describe('putObject', () => {
    it('creates an Upload with the correct parameters', async () => {
      const mockUpload = {
        on: jest.fn(),
        done: jest.fn().mockResolvedValue(undefined),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await service.putObject({path: testFilePath, file: testFile});

      expect(Upload).toHaveBeenCalledWith({
        client: expect.objectContaining({
          send: expect.any(Function),
        }),
        partSize: PART_SIZE,
        queueSize: MAX_QUEUE_SIZE,
        leavePartsOnError: false,
        params: {
          Bucket: testConfig.bucket,
          Body: testFile,
          Key: testFilePath,
          ContentType: testFile.type,
          ContentLength: testFile.size,
          Metadata: undefined,
        },
        abortController: undefined,
      });
    });

    it('includes metadata when provided', async () => {
      const metadata = {
        'test-key': 'test-value',
        'another-key': 'another-value',
      };

      const mockUpload = {
        on: jest.fn(),
        done: jest.fn().mockResolvedValue(undefined),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await service.putObject({path: testFilePath, file: testFile, metadata});

      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Metadata: metadata,
          }),
        }),
      );
    });

    it('handles EntityTooLarge errors with a specific error message', async () => {
      const error = createS3Error('EntityTooLarge', 'Entity too large');
      const mockUpload = {
        on: jest.fn(),
        done: jest.fn().mockRejectedValue(error),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(CellsStorageError);
      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(/The object was too large/);
    });

    it('handles other S3ServiceExceptions with a generic error message', async () => {
      const errorName = 'OtherError';
      const errorMessage = 'Some other error';
      const error = createS3Error(errorName, errorMessage);
      const mockUpload = {
        on: jest.fn(),
        done: jest.fn().mockRejectedValue(error),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(CellsStorageError);
      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toThrow(
        new RegExp(`Error from S3 while uploading object to.*${errorName}: ${errorMessage}`),
      );
    });

    it('passes through other types of errors without wrapping them', async () => {
      const error = new Error('Unexpected error');
      const mockUpload = {
        on: jest.fn(),
        done: jest.fn().mockRejectedValue(error),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await expect(service.putObject({path: testFilePath, file: testFile})).rejects.toBe(error);
    });

    it('forwards every incremental progress event to the callback', async () => {
      const progressCallback = jest.fn();
      const mockUpload = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'httpUploadProgress') {
            callback({loaded: 10, total: 100});
            callback({loaded: 45, total: 100});
            callback({loaded: 80, total: 100});
          }
        }),
        done: jest.fn().mockResolvedValue(undefined),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await service.putObject({path: testFilePath, file: testFile, progressCallback});

      expect(progressCallback).toHaveBeenNthCalledWith(1, 0.1);
      expect(progressCallback).toHaveBeenNthCalledWith(2, 0.45);
      expect(progressCallback).toHaveBeenNthCalledWith(3, 0.8);
    });

    it('does not call progress callback when progress information is missing', async () => {
      const progressCallback = jest.fn();
      const mockUpload = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'httpUploadProgress') {
            callback({loaded: undefined, total: undefined});
          }
        }),
        done: jest.fn().mockResolvedValue(undefined),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await service.putObject({path: testFilePath, file: testFile, progressCallback});

      expect(progressCallback).not.toHaveBeenCalled();
    });

    it('does not set up progress listener when no callback is provided', async () => {
      const mockUpload = {
        on: jest.fn(),
        done: jest.fn().mockResolvedValue(undefined),
      };

      (Upload as unknown as jest.Mock).mockImplementation(() => mockUpload);

      await service.putObject({path: testFilePath, file: testFile});

      expect(mockUpload.on).not.toHaveBeenCalled();
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
