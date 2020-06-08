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

import ko from 'knockout';

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

export class AssetRemoteData {
  public cancelDownload: () => void;
  public readonly downloadProgress: ko.Observable<number>;
  public readonly identifier?: string;
  public readonly otrKey?: Uint8Array;
  public readonly sha256?: Uint8Array;
  public readonly urlData?: AssetUrlData;

  constructor(identifier: string, urlData: AssetUrlData, otrKey?: Uint8Array, sha256Checksum?: Uint8Array) {
    this.identifier = identifier;
    this.otrKey = otrKey;
    this.sha256 = sha256Checksum;
    this.urlData = urlData;
    this.downloadProgress = ko.observable();
    this.cancelDownload = () => {};
  }

  static v3(
    assetKey: string,
    otrKey?: Uint8Array,
    sha256?: Uint8Array,
    assetToken?: string,
    forceCaching: boolean = false,
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
      sha256,
    );
  }

  static v2(
    conversationId: string,
    assetId: string,
    otrKey: Uint8Array,
    sha256: Uint8Array,
    forceCaching: boolean = false,
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
      sha256,
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
}
