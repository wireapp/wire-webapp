/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {AssetUploadData} from '@wireapp/api-client/lib/asset/';
import {container} from 'tsyringe';

import {createUuid} from 'Util/uuid';
import {ValidationUtilError} from 'Util/ValidationUtil';

import {encryptAesAsset} from './AssetCrypto';
import {AssetRemoteData} from './AssetRemoteData';
import {AssetRepository, AssetUploadOptions} from './AssetRepository';
import {AssetService} from './AssetService';

import {EventMapper} from '../conversation/EventMapper';
import {APIClient} from '../service/APIClientSingleton';
import {Core} from '../service/CoreSingleton';

describe('AssetRepository', () => {
  let assetRepository: AssetRepository;
  const messageId = createUuid();
  const file = new Blob();
  const options = {} as AssetUploadOptions;
  let core: Core;

  beforeEach(async () => {
    core = container.resolve(Core);
    const mockedAPIClient = {
      asset: {
        api: {
          postAsset: jest.fn().mockImplementation(() =>
            Promise.resolve({
              cancel: () => {},
              response: Promise.resolve({}),
            }),
          ),
        },
      },
    } as unknown as APIClient;
    assetRepository = new AssetRepository(new AssetService(mockedAPIClient), core);
  });

  describe('load unencrypted v1 asset', () => {
    let remote_data: AssetRemoteData;

    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(() => {
      const conversation_id = createUuid();
      const asset_id = createUuid();
      remote_data = AssetRemoteData.v1(conversation_id, asset_id);
      spyOn(assetRepository as any, 'loadBuffer').and.returnValue(
        Promise.resolve({buffer: video_bytes.buffer, mimeType: video_type}),
      );
    });

    it('should load and decrypt v1 asset', async () => {
      const blob = await assetRepository.load(remote_data);
      expect<void | Blob>(new Blob([video_bytes], {type: video_type})).toEqual(blob);
    });
  });

  describe('load encrypted v2 asset', () => {
    let remote_data: AssetRemoteData;
    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(async () => {
      const {cipherText, keyBytes, sha256} = await encryptAesAsset(video_bytes);
      const conversation_id = createUuid();
      const asset_id = createUuid();
      remote_data = AssetRemoteData.v2(conversation_id, asset_id, new Uint8Array(keyBytes), new Uint8Array(sha256));
      spyOn(assetRepository as any, 'loadBuffer').and.returnValue(
        Promise.resolve({buffer: cipherText, mimeType: video_type}),
      );
    });

    it('should load and decrypt v2 asset', async () => {
      const blob = await assetRepository.load(remote_data);
      expect<void | Blob>(new Blob([video_bytes], {type: video_type})).toEqual(blob);
    });
  });

  it('detects a malformed asset key', async () => {
    /* cspell:disable */
    const event: any = {
      category: 128,
      conversation: '61350a90-e522-4ee5-90b7-f55b648e34da',
      data: {
        content_length: 73029,
        content_type: 'image/jpeg',
        info: {height: 448, name: null, nonce: '51b8e5c5-4088-4177-a5ad-b001fef11eac', tag: 'medium', width: 588},
        key: '../../../search/contacts',
        otr_key: {
          '0': 130,
          '1': 255,
          '10': 2,
          '11': 194,
          '12': 160,
          '13': 122,
          '14': 173,
          '15': 82,
          '16': 36,
          '17': 77,
          '18': 50,
          '19': 186,
          '2': 81,
          '20': 246,
          '21': 54,
          '22': 36,
          '23': 235,
          '24': 81,
          '25': 19,
          '26': 179,
          '27': 69,
          '28': 127,
          '29': 113,
          '3': 125,
          '30': 248,
          '31': 74,
          '4': 202,
          '5': 165,
          '6': 197,
          '7': 175,
          '8': 79,
          '9': 18,
        },
        sha256: {
          '0': 49,
          '1': 137,
          '10': 37,
          '11': 35,
          '12': 87,
          '13': 175,
          '14': 205,
          '15': 157,
          '16': 225,
          '17': 173,
          '18': 63,
          '19': 43,
          '2': 43,
          '20': 133,
          '21': 197,
          '22': 115,
          '23': 195,
          '24': 142,
          '25': 44,
          '26': 98,
          '27': 222,
          '28': 75,
          '29': 56,
          '3': 166,
          '30': 159,
          '31': 66,
          '4': 242,
          '5': 222,
          '6': 42,
          '7': 96,
          '8': 44,
          '9': 22,
        },
        status: 'uploaded',
        token: 'hYQytxHS6hSP6DlemD13uQ==&size=100&q=test',
      },
      from: '532af01e-1e24-4366-aacf-33b67d4ee376',
      id: '51b8e5c5-4088-4177-a5ad-b001fef11eac',
      primary_key: 6,
      status: 1,
      time: '2017-08-16T16:13:01.168Z',
      type: 'conversation.asset-add',
    };

    const asset_et = new EventMapper()._mapAssetImage(event);
    await expect(assetRepository.generateAssetUrl(asset_et.resource())).rejects.toThrow(ValidationUtilError);
  });

  it('keeps track of current uploads and removes it once finished', async () => {
    spyOn(core.service!.asset, 'uploadAsset').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    await assetRepository.uploadFile(file, messageId, options);
    expect(assetRepository.getNumberOfOngoingUploads()).toBe(0);
  });

  it('removes cancelled uploads and cancels upload', () => {
    spyOn(core.service!.asset, 'uploadAsset').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    const uploadedPromise = assetRepository.uploadFile(file, messageId, options);

    assetRepository.cancelUpload(messageId);
    expect(assetRepository.getNumberOfOngoingUploads()).toBe(0);
    return uploadedPromise;
  });

  it('updates the upload progress while the file is being uploaded', async () => {
    spyOn(core.service!.asset, 'uploadAsset').and.callFake((_asset, _options, callback) => {
      const uploadProgress = assetRepository.getUploadProgress(messageId);

      callback(0.1);
      expect(uploadProgress()).toBe(10);

      callback(0.5);
      expect(uploadProgress()).toBe(50);

      callback(1);
      expect(uploadProgress()).toBe(100);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });
    await assetRepository.uploadFile(file, messageId, options);
  });
});
