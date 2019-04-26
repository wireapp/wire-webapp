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

import {Logger, getLogger} from 'Util/Logger';
import {loadUrlBuffer} from 'Util/util';

import {decryptAesAsset} from './AssetCrypto';
import {getAssetUrl, setAssetUrl} from './AssetURLCache';

export type AssetUrlData = AssetUrlDataVersion1 | AssetUrlDataVersion2 | AssetUrlDataVersion3;

export interface AssetUrlDataVersion3 {
  assetKey: string;
  assetToken: string;
  forceCaching: boolean;
  version: 3;
}

export interface AssetUrlDataVersion2 {
  assetId: string;
  conversationId: string;
  forceCaching: boolean;
  version: 2;
}

export interface AssetUrlDataVersion1 {
  assetId: string;
  conversationId: string;
  forceCaching: boolean;
  version: 1;
}

class AssetRemoteData {
  public cancelDownload: Function;

  private readonly downloadProgress: ko.Observable<number>;
  private readonly identifier?: string;
  private loadPromise: Promise<void | Blob> | undefined;
  private readonly logger: Logger;
  private readonly otrKey?: Uint8Array;
  private readonly sha256?: Uint8Array;
  private readonly urlData?: AssetUrlData;

  constructor(identifier: string, urlData: AssetUrlData, otrKey?: Uint8Array, sha256Checksum?: Uint8Array) {
    this.cancelDownload = () => {};
    this.downloadProgress = ko.observable();
    this.identifier = identifier;
    this.loadPromise = undefined;
    this.logger = getLogger('AssetRemoteData');
    this.otrKey = otrKey;
    this.sha256 = sha256Checksum;
    this.urlData = urlData;
  }

  generateUrl(): Promise<string> {
    switch (this.urlData.version) {
      case 3:
        return window.wire.app.service.asset.generateAssetUrlV3(
          this.urlData.assetKey,
          this.urlData.assetToken,
          this.urlData.forceCaching
        );
      case 2:
        return window.wire.app.service.asset.generateAssetUrlV2(
          this.urlData.assetId,
          this.urlData.conversationId,
          this.urlData.forceCaching
        );
      case 1:
        return window.wire.app.service.asset.generateAssetUrl(
          this.urlData.assetId,
          this.urlData.conversationId,
          this.urlData.forceCaching
        );
      default:
        throw Error('Cannot map URL data.');
    }
  }

  static v3(
    assetKey: string,
    otrKey?: Uint8Array,
    sha256?: Uint8Array,
    assetToken?: string,
    forceCaching: boolean = false
  ): AssetRemoteData {
    return new AssetRemoteData(
      assetKey,
      {
        assetKey,
        assetToken,
        forceCaching,
        version: 3,
      },
      otrKey,
      sha256
    );
  }

  static v2(
    conversationId: string,
    assetId: string,
    otrKey: Uint8Array,
    sha256: Uint8Array,
    forceCaching: boolean = false
  ): AssetRemoteData {
    return new AssetRemoteData(
      `${conversationId}${assetId}`,
      {
        assetId,
        conversationId,
        forceCaching,
        version: 2,
      },
      otrKey,
      sha256
    );
  }

  static v1(conversationId: string, assetId: string, forceCaching: boolean = false): AssetRemoteData {
    return new AssetRemoteData(`${conversationId}${assetId}`, {
      assetId,
      conversationId,
      forceCaching,
      version: 1,
    });
  }

  getObjectUrl(): Promise<string> {
    const objectUrl = getAssetUrl(this.identifier);
    return objectUrl
      ? Promise.resolve(objectUrl)
      : this.load().then(blob => {
          const url = window.URL.createObjectURL(blob);
          return setAssetUrl(this.identifier, url);
        });
  }

  load(): Promise<void | Blob> {
    let type: string;

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadBuffer()
      .then(({buffer, mimeType}) => {
        type = mimeType;
        this.loadPromise = undefined;
        const isEncryptedAsset = this.otrKey && this.sha256;
        return isEncryptedAsset ? decryptAesAsset(buffer, this.otrKey.buffer, this.sha256.buffer) : buffer;
      })
      .then(plaintext => new Blob([new Uint8Array(plaintext)], {type}))
      .catch(error => {
        this.loadPromise = undefined;
        const errorMessage = (error && error.message) || '';
        const isAssetNotFound = errorMessage.endsWith(z.error.BackendClientError.STATUS_CODE.NOT_FOUND);
        const isServerError = errorMessage.endsWith(z.error.BackendClientError.STATUS_CODE.INTERNAL_SERVER_ERROR);

        const isExpectedError = isAssetNotFound || isServerError;
        if (!isExpectedError) {
          throw error;
        }
      });

    return this.loadPromise;
  }

  _loadBuffer(): Promise<{
    buffer: ArrayBuffer;
    mimeType: string;
  }> {
    return this.generateUrl()
      .then(generatedUrl => {
        return loadUrlBuffer(generatedUrl, (xhr: XMLHttpRequest) => {
          xhr.onprogress = event => this.downloadProgress(Math.round((event.loaded / event.total) * 100));
          this.cancelDownload = () => xhr.abort.call(xhr);
        });
      })
      .catch(error => {
        const isValidationUtilError = error instanceof z.util.ValidationUtilError;
        const message = isValidationUtilError
          ? `Failed to validate an asset URL (_loadBuffer): ${error.message}`
          : `Failed to load asset: ${error.message || error}`;

        this.logger.error(message);

        throw error;
      });
  }
}

export {AssetRemoteData};
