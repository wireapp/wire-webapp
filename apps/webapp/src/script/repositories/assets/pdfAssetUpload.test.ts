/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {waitFor} from '@testing-library/react';
import {noop} from 'noop-esm';

import {AssetRepository, AssetUploadOptions} from './assetRepository';
import type {createPdfPreview} from './pdfPreview';

import {APIClient} from '../../apiClient/apiClient';
import {AssetRetentionPolicy} from '../../apiClient/asset/assetRetentionPolicy';
import {nodePlatform} from '../../apiClient/shims/node/platform';
import {RequestCancellationError} from '../../apiClient/user/userError';
import {createCoreTestFixture} from '../../util/test/createCoreTestFixture';
import {AssetService} from '../../core/conversation/assetService/assetService';
import {createStartupFeatureTogglesFromLocationSearch} from '../../featureToggles/startupFeatureToggles';

describe('encrypted PDF uploads', () => {
  const enabledToggles = createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview');
  const createPreview = jest.fn<ReturnType<typeof createPdfPreview>, Parameters<typeof createPdfPreview>>();
  const file = new Blob(['%PDF'], {type: 'application/pdf'});
  const thumbnail = {blob: new Blob(['thumbnail'], {type: 'image/png'}), width: 320, height: 180};
  const options: AssetUploadOptions = {
    public: true,
    retention: AssetRetentionPolicy.EXPIRING,
    auditData: {conversationId: {id: 'conversation', domain: 'wire.test'}, filename: 'report.pdf', filetype: file.type},
  };
  const original = {
    key: 'original',
    domain: 'wire.test',
    keyBytes: new Uint8Array(32).fill(1),
    sha256: new Uint8Array(32).fill(2),
    cipherText: new Uint8Array(),
  };
  const preview = {...original, key: 'thumbnail', keyBytes: new Uint8Array(32).fill(3)};
  let uploadAsset: jest.Mock;
  let repository: AssetRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    createPreview.mockResolvedValue(thumbnail);
    uploadAsset = jest
      .fn()
      .mockResolvedValueOnce({response: Promise.resolve(original), cancel: jest.fn()})
      .mockResolvedValueOnce({response: Promise.resolve(preview), cancel: jest.fn()});
    repository = new AssetRepository(
      createCoreTestFixture({service: {asset: {uploadAsset}}}),
      undefined,
      createPreview,
      enabledToggles,
    );
  });

  it('uploads the thumbnail through the encrypted asset service and returns its descriptor', async () => {
    const result = await repository.uploadFile(file, 'message', options, true);

    expect(uploadAsset).toHaveBeenCalledTimes(2);
    expect(uploadAsset.mock.calls[1][0]).toEqual(Buffer.from('thumbnail'));
    expect(uploadAsset.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        retention: options.retention,
        auditData: {...options.auditData, filename: 'report.pdf.preview.png', filetype: 'image/png'},
      }),
    );
    expect(result.key).toBe('original');
    expect(result.preview).toEqual({
      mimeType: 'image/png',
      size: thumbnail.blob.size,
      image: {width: 320, height: 180},
      remote: {
        assetId: preview.key,
        assetDomain: preview.domain,
        assetToken: undefined,
        otrKey: preview.keyBytes,
        sha256: preview.sha256,
      },
    });
    expect(repository.getNumberOfOngoingUploads()).toBe(0);
  });

  it('uploads only ciphertext and decrypts the preview with its independent key', async () => {
    using apiClient = new APIClient({platform: nodePlatform});
    const service = new AssetService(apiClient);
    const post = jest.spyOn(apiClient.api.asset, 'postAsset').mockImplementation(() => {
      return {
        cancel: noop,
        response: Promise.resolve({key: 'asset', domain: 'wire.test'}),
      };
    });
    repository = new AssetRepository(
      createCoreTestFixture({service: {asset: service}}),
      undefined,
      createPreview,
      enabledToggles,
    );

    const result = await repository.uploadFile(file, 'message', options, false);

    expect(post).toHaveBeenCalledTimes(2);
    const originalCiphertext = post.mock.calls[0][0];
    const previewCiphertext = post.mock.calls[1][0];
    expect(previewCiphertext).not.toEqual(new Uint8Array(Buffer.from('thumbnail')));
    expect(result.preview?.remote?.otrKey).not.toEqual(result.keyBytes);
    const remote = result.preview?.remote;
    expect(remote).toBeDefined();
    const plaintext = await service.decryptAsset({
      cipherText: new Uint8Array(previewCiphertext),
      keyBytes: remote?.otrKey ?? new Uint8Array(),
      sha256: remote?.sha256 ?? new Uint8Array(),
    });
    expect(Buffer.from(plaintext).toString()).toBe('thumbnail');
    expect(originalCiphertext).not.toEqual(new Uint8Array(Buffer.from('%PDF')));
  });

  it('sends the original when preview generation fails', async () => {
    createPreview.mockResolvedValue(undefined);

    const result = await repository.uploadFile(file, 'message', options, false);

    expect(result.key).toBe('original');
    expect(result.preview).toBeUndefined();
    expect(uploadAsset).toHaveBeenCalledTimes(1);
  });

  it('sends the original when preview upload fails', async () => {
    uploadAsset
      .mockReset()
      .mockResolvedValueOnce({response: Promise.resolve(original), cancel: jest.fn()})
      .mockRejectedValueOnce(new Error('Unavailable'));

    const result = await repository.uploadFile(file, 'message', options, false);

    expect(result.key).toBe('original');
    expect(result.preview).toBeUndefined();
    expect(repository.getNumberOfOngoingUploads()).toBe(0);
  });

  it('cancels preview generation without uploading a thumbnail or publishing the original', async () => {
    createPreview.mockImplementation((_file, signal) => {
      return new Promise(resolve => {
        signal.addEventListener(
          'abort',
          () => {
            return resolve(undefined);
          },
          {once: true},
        );
      });
    });
    const result = repository.uploadFile(file, 'message', options, false);
    const rejected = expect(result).rejects.toBeInstanceOf(RequestCancellationError);
    await waitFor(() => {
      return expect(createPreview).toHaveBeenCalledTimes(1);
    });

    repository.cancelUpload('message');

    await rejected;
    expect(uploadAsset).toHaveBeenCalledTimes(1);
    expect(repository.getNumberOfOngoingUploads()).toBe(0);
  });

  it('cancels an in-flight thumbnail upload', async () => {
    const cancel = jest.fn();
    let rejectUpload: (error: Error) => void = noop;
    uploadAsset
      .mockReset()
      .mockResolvedValueOnce({response: Promise.resolve(original), cancel: jest.fn()})
      .mockImplementationOnce(() => {
        const response = new Promise((_resolve, reject) => {
          rejectUpload = reject;
        });
        cancel.mockImplementation(() => {
          return rejectUpload(new RequestCancellationError('Canceled'));
        });
        return Promise.resolve({response, cancel});
      });
    const result = repository.uploadFile(file, 'message', options, false);
    const rejected = expect(result).rejects.toBeInstanceOf(RequestCancellationError);
    await waitFor(() => {
      return expect(uploadAsset).toHaveBeenCalledTimes(2);
    });

    repository.cancelUpload('message');

    await rejected;
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('removes queue entries and cancel tokens when original upload fails', async () => {
    uploadAsset.mockReset().mockRejectedValue(new Error('Original failed'));

    await expect(repository.uploadFile(file, 'message', options, false)).rejects.toThrow('Original failed');
    expect(repository.getNumberOfOngoingUploads()).toBe(0);
    expect(repository.uploadCancelTokens.message).toBeUndefined();
    expect(createPreview).not.toHaveBeenCalled();
  });

  it('uploads only the original PDF when its feature flag is disabled', async () => {
    repository = new AssetRepository(
      createCoreTestFixture({service: {asset: {uploadAsset}}}),
      undefined,
      createPreview,
    );

    const result = await repository.uploadFile(file, 'message', options, false);

    expect(result.key).toBe('original');
    expect(result.preview).toBeUndefined();
    expect(createPreview).not.toHaveBeenCalled();
    expect(uploadAsset).toHaveBeenCalledTimes(1);
  });

  it('does not generate thumbnails for non-PDF files', async () => {
    await repository.uploadFile(new Blob(['text'], {type: 'text/plain'}), 'message', options, false);

    expect(createPreview).not.toHaveBeenCalled();
    expect(uploadAsset).toHaveBeenCalledTimes(1);
  });
});
