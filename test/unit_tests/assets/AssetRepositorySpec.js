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
 *
 */

import {container} from 'tsyringe';
import {createRandomUuid} from 'Util/util';

import {AssetRepository} from 'src/script/assets/AssetRepository';
import {AssetService} from 'src/script/assets/AssetService';
import {APIClientSingleton} from 'src/script/service/APIClientSingleton';
import {BackendClient} from 'src/script/service/BackendClient';

const messageId = createRandomUuid();
const file = new Blob();
const options = {};

describe('AssetRepository', () => {
  const assetRepository = new AssetRepository(
    new AssetService(container.resolve(APIClientSingleton), container.resolve(BackendClient)),
  );

  it('keeps track of current uploads', () => {
    spyOn(assetRepository.assetService, 'uploadFile').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);

      return Promise.resolve({
        response: Promise.resolve({
          key: '',
          token: '',
        }),
      });
    });

    assetRepository.uploadFile(messageId, file, options, false);
  });

  it('removes finished uploads', () => {
    spyOn(assetRepository.assetService, 'uploadFile').and.callFake(() => {
      expect(assetRepository.getNumberOfOngoingUploads()).toBe(1);
      return Promise.resolve({
        response: Promise.resolve({
          key: '',
          token: '',
        }),
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
        response: Promise.resolve({
          key: '',
          token: '',
        }),
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
        response: Promise.resolve({
          key: '',
          token: '',
        }),
      });
    });

    await assetRepository.uploadFile(messageId, file, options, false);
  });
});
