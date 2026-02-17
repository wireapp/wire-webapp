/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {AssetAPI} from './AssetAPI';
import {AssetUploadData} from './AssetAPI.schema';
import {AssetRetentionPolicy} from './AssetRetentionPolicy';

import {HttpClient, StatusCode, SyntheticErrorLabel} from '../http';
import {RequestCancellationError} from '../user';

describe('AssetAPI', () => {
  let assetAPI: AssetAPI;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockSendRequest: jest.Mock;

  const validAssetId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const validDomain = 'example.wire.com';
  const validToken = 'dGVzdC10b2tlbg==';
  const mockArrayBuffer = new ArrayBuffer(8);

  beforeEach(() => {
    mockSendRequest = jest.fn();
    mockHttpClient = {
      sendRequest: mockSendRequest,
    } as unknown as jest.Mocked<HttpClient>;

    assetAPI = new AssetAPI(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAsset', () => {
    it('should fetch asset with qualified endpoint', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {'content-type': 'image/jpeg'},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      const result = await assetAPI.getAsset(validAssetId, validDomain, validToken).response;

      expect(result).toEqual({
        buffer: mockArrayBuffer,
        mimeType: 'image/jpeg',
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: `/assets/${validDomain}/${validAssetId}`,
          params: expect.objectContaining({asset_token: validToken}),
          responseType: 'arraybuffer',
        }),
      );
    });

    it('should work without token', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      await assetAPI.getAsset(validAssetId, validDomain).response;

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.not.objectContaining({asset_token: expect.anything()}),
        }),
      );
    });

    it('should include forceCaching parameter when true', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      await assetAPI.getAsset(validAssetId, validDomain, null, true).response;

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({forceCaching: true}),
        }),
      );
    });

    it('should throw TypeError for invalid asset ID', () => {
      expect(() => assetAPI.getAsset('invalid id!', validDomain)).toThrow(TypeError);
    });

    it('should throw TypeError for invalid domain', () => {
      expect(() => assetAPI.getAsset(validAssetId, 'invalid domain')).toThrow(TypeError);
    });

    it('should handle cancellation', async () => {
      const mockError = {message: SyntheticErrorLabel.REQUEST_CANCELLED};
      mockSendRequest.mockRejectedValue(mockError);

      const request = assetAPI.getAsset(validAssetId, validDomain);

      await expect(request.response).rejects.toThrow(RequestCancellationError);
      await expect(request.response).rejects.toThrow('Asset download got cancelled.');
    });

    it('should handle progress callback', async () => {
      const progressCallback = jest.fn();
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      await assetAPI.getAsset(validAssetId, validDomain, null, false, progressCallback).response;

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          onDownloadProgress: expect.any(Function),
          onUploadProgress: expect.any(Function),
        }),
      );
    });
  });

  describe('getServiceAsset', () => {
    it('should fetch service/bot asset', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {'content-type': 'image/svg+xml'},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      const result = await assetAPI.getServiceAsset(validAssetId, validToken).response;

      expect(result).toEqual({
        buffer: mockArrayBuffer,
        mimeType: 'image/svg+xml',
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: `/bot/assets/${validAssetId}`,
          params: expect.objectContaining({asset_token: validToken}),
        }),
      );
    });

    it('should throw TypeError for invalid asset ID', () => {
      expect(() => assetAPI.getServiceAsset('not valid!')).toThrow(TypeError);
    });
  });

  describe('postAsset', () => {
    const mockAssetData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockUploadResponse: AssetUploadData = {
      expires: '2025-12-31T23:59:59.000Z',
      key: 'asset-key-123',
      token: 'upload-token-456',
    };

    it('should upload asset to /assets endpoint', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockUploadResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      const result = await assetAPI.postAsset(mockAssetData).response;

      expect(result).toEqual(mockUploadResponse);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: '/assets',
          headers: expect.objectContaining({
            'Content-Type': expect.stringContaining('multipart/mixed'),
          }),
        }),
      );
    });

    it('should include default options when not provided', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockUploadResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      await assetAPI.postAsset(mockAssetData).response;

      const callArg = mockSendRequest.mock.calls[0][0];
      const bodyString = new TextDecoder().decode(callArg.data);

      expect(bodyString).toContain('"public":true');
      expect(bodyString).toContain(`"retention":"${AssetRetentionPolicy.PERSISTENT}"`);
    });

    it('should respect custom options', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockUploadResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      const options = {
        public: false,
        retention: AssetRetentionPolicy.VOLATILE,
        domain: 'custom.wire.com',
      };

      await assetAPI.postAsset(mockAssetData, options).response;

      const callArg = mockSendRequest.mock.calls[0][0];
      const bodyString = new TextDecoder().decode(callArg.data);

      expect(bodyString).toContain('"public":false');
      expect(bodyString).toContain(`"retention":"${AssetRetentionPolicy.VOLATILE}"`);
      expect(bodyString).toContain('"domain":"custom.wire.com"');
    });

    it('should handle cancellation', async () => {
      const mockError = {message: SyntheticErrorLabel.REQUEST_CANCELLED};
      mockSendRequest.mockRejectedValue(mockError);

      const request = assetAPI.postAsset(mockAssetData);

      await expect(request.response).rejects.toThrow(RequestCancellationError);
      await expect(request.response).rejects.toThrow('Asset upload got cancelled.');
    });

    it('should create multipart body with correct structure', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockUploadResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      await assetAPI.postAsset(mockAssetData).response;

      const callArg = mockSendRequest.mock.calls[0][0];
      const bodyString = new TextDecoder().decode(callArg.data);

      expect(bodyString).toContain('Content-Type: application/json;charset=utf-8');
      expect(bodyString).toContain('Content-Type: application/octet-stream');
      expect(bodyString).toContain('Content-MD5:');
      expect(bodyString).toMatch(/--Frontier.*\r\n/);
    });

    it('should handle progress callback', async () => {
      const progressCallback = jest.fn();
      mockSendRequest.mockResolvedValue({
        data: mockUploadResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      await assetAPI.postAsset(mockAssetData, undefined, progressCallback).response;

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          onUploadProgress: expect.any(Function),
        }),
      );
    });
  });

  describe('postServiceAsset', () => {
    const mockAssetData = new Uint8Array([10, 20, 30]);
    const mockUploadResponse: AssetUploadData = {
      expires: '2025-12-31T23:59:59.000Z',
      key: 'service-asset-key',
      token: 'service-token',
    };

    it('should upload service/bot asset', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockUploadResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      const result = await assetAPI.postServiceAsset(mockAssetData).response;

      expect(result).toEqual(mockUploadResponse);
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: '/bot/assets',
        }),
      );
    });
  });

  describe('Token Validation', () => {
    it('should accept valid base64 tokens', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      const validTokens = ['YWJjZGVm', 'dGVzdA==', 'MTIzNDU2Nzg5MA=='];

      for (const token of validTokens) {
        await expect(assetAPI.getAsset(validAssetId, validDomain, token).response).resolves.toBeDefined();
      }
    });

    it('should reject tokens with invalid characters', () => {
      const invalidToken = 'invalid token!';
      expect(() => assetAPI.getAsset(validAssetId, validDomain, invalidToken)).toThrow(TypeError);
      expect(() => assetAPI.getAsset(validAssetId, validDomain, invalidToken)).toThrow(/to be base64 encoded string/);
    });
  });

  describe('Error Handling', () => {
    it('should propagate network errors', async () => {
      const networkError = new Error('Network error');
      mockSendRequest.mockRejectedValue(networkError);

      await expect(assetAPI.getAsset(validAssetId, validDomain).response).rejects.toThrow('Network error');
    });

    it('should propagate backend errors', async () => {
      const backendError = {
        message: 'Not Found',
        code: 404,
        label: 'not-found',
      };
      mockSendRequest.mockRejectedValue(backendError);

      await expect(assetAPI.postAsset(new Uint8Array([1, 2, 3])).response).rejects.toEqual(backendError);
    });
  });

  describe('Request Cancellation', () => {
    it('should provide cancel function for requests', async () => {
      mockSendRequest.mockResolvedValue({
        data: mockArrayBuffer,
        headers: {},
        status: StatusCode.OK,
        statusText: 'OK',
        config: {},
      });

      const getRequest = assetAPI.getAsset(validAssetId, validDomain);
      const postRequest = assetAPI.postAsset(new Uint8Array([1, 2, 3]));

      expect(getRequest.cancel).toBeInstanceOf(Function);
      expect(postRequest.cancel).toBeInstanceOf(Function);
      expect(() => getRequest.cancel()).not.toThrow();
      expect(() => postRequest.cancel()).not.toThrow();
    });
  });

  describe('Response Validation', () => {
    it('should validate successful upload response', async () => {
      const validResponse: AssetUploadData = {
        domain: 'example.com',
        expires: '2025-12-31T23:59:59.000Z',
        key: '3-1-47de4580-ae51-4650-acbb-d10c028cb0ac',
        token: 'aGVsbG8=',
      };

      mockSendRequest.mockResolvedValue({
        data: validResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      const result = await assetAPI.postAsset(new Uint8Array([1, 2, 3])).response;

      expect(result).toEqual(validResponse);
      expect(result.key).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expires).toBeDefined();
    });

    it('should log warning for invalid response but still return data', async () => {
      const invalidResponse = {
        // Missing required fields
        expires: 'invalid-date',
      };

      const consoleWarnSpy = jest.spyOn(console, 'log').mockImplementation();

      mockSendRequest.mockResolvedValue({
        data: invalidResponse,
        headers: {},
        status: StatusCode.CREATED,
        statusText: 'Created',
        config: {},
      });

      const result = await assetAPI.postAsset(new Uint8Array([1, 2, 3])).response;

      expect(result).toEqual(invalidResponse);
      consoleWarnSpy.mockRestore();
    });
  });
});
