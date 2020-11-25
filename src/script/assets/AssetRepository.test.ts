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

import {container} from 'tsyringe';
import {createRandomUuid} from 'Util/util';
import {encryptAesAsset} from './AssetCrypto';
import {AssetRemoteData} from './AssetRemoteData';
import {AssetRepository, AssetUploadOptions} from './AssetRepository';
import {EventMapper} from '../conversation/EventMapper';
import {ValidationUtilError} from 'Util/ValidationUtil';
import {AssetUploadData} from '@wireapp/api-client/src/asset';

describe('AssetRepository', () => {
  let assetRepository: AssetRepository;
  const messageId = createRandomUuid();
  const file = new Blob();
  const options = {} as AssetUploadOptions;

  beforeEach(() => {
    assetRepository = container.resolve(AssetRepository);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('load unencrypted v1 asset', () => {
    let remote_data: AssetRemoteData;

    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(() => {
      const conversation_id = createRandomUuid();
      const asset_id = createRandomUuid();
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
      const conversation_id = createRandomUuid();
      const asset_id = createRandomUuid();
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

  it('detects a malformed asset key', () => {
    // prettier-ignore
    // eslint-disable-next-line
    const event: any = {"conversation":"61350a90-e522-4ee5-90b7-f55b648e34da","from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"51b8e5c5-4088-4177-a5ad-b001fef11eac","status":1,"time":"2017-08-16T16:13:01.168Z","data":{"content_length":73029,"content_type":"image/jpeg","info":{"name":null,"nonce":"51b8e5c5-4088-4177-a5ad-b001fef11eac","height":448,"width":588,"tag":"medium"},"key":"../../../search/contacts","otr_key":{"0":130,"1":255,"2":81,"3":125,"4":202,"5":165,"6":197,"7":175,"8":79,"9":18,"10":2,"11":194,"12":160,"13":122,"14":173,"15":82,"16":36,"17":77,"18":50,"19":186,"20":246,"21":54,"22":36,"23":235,"24":81,"25":19,"26":179,"27":69,"28":127,"29":113,"30":248,"31":74},"sha256":{"0":49,"1":137,"2":43,"3":166,"4":242,"5":222,"6":42,"7":96,"8":44,"9":22,"10":37,"11":35,"12":87,"13":175,"14":205,"15":157,"16":225,"17":173,"18":63,"19":43,"20":133,"21":197,"22":115,"23":195,"24":142,"25":44,"26":98,"27":222,"28":75,"29":56,"30":159,"31":66},"status":"uploaded","token":"hYQytxHS6hSP6DlemD13uQ==&size=100&q=test"},"type":"conversation.asset-add","category":128,"primary_key":6};

    const asset_et = new EventMapper()['_mapAssetImage'](event);

    try {
      assetRepository.generateAssetUrl(asset_et.resource());
    } catch (error) {
      expect(error).toEqual(jasmine.any(ValidationUtilError));
    }
  });

  it('keeps track of current uploads', () => {
    spyOn(assetRepository.assetService, 'uploadFile').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);

      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    assetRepository.uploadFile(messageId, file, options, false);
  });

  it('removes finished uploads', () => {
    spyOn(assetRepository.assetService, 'uploadFile').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    return assetRepository.uploadFile(messageId, file, options, false).then(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(0);
    });
  });

  it('removes cancelled uploads and cancels upload', () => {
    spyOn(assetRepository.assetService, 'uploadFile').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        cancel: null,
        response: Promise.resolve({
          key: '',
          token: '',
        } as AssetUploadData),
      });
    });

    assetRepository.uploadFile(messageId, file, options, false);

    assetRepository.cancelUpload(messageId);
    expect(assetRepository.getNumberOfOngoingUploads()).toBe(0);
  });

  it('updates the upload progress while the file is being uploaded', async () => {
    spyOn(assetRepository.assetService, 'uploadFile').and.callFake((_asset, _options, callback) => {
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

    await assetRepository.uploadFile(messageId, file, options, false);
  });
});
