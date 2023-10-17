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

export type AssetUrlData = AssetUrlDataVersion1 | AssetUrlDataVersion2 | AssetUrlDataVersion3 | AssetUrlDataVersion4;

interface AssetUrlDataVersion3 {
  assetKey: string;
  assetToken: string;
  forceCaching: boolean;
  version: 3;
}
interface AssetUrlDataVersion4 extends Omit<AssetUrlDataVersion3, 'version'> {
  assetDomain: string;
  version: 4;
}

interface AssetUrlDataVersion2 {
  assetId: string;
  conversationId: string;
  forceCaching: boolean;
  version: 2;
}

interface AssetUrlDataVersion1 {
  assetId: string;
  conversationId: string;
  forceCaching: boolean;
  version: 1;
}

export class AssetRemoteData {
  public cancelDownload: () => void;
  public readonly downloadProgress: ko.Observable<number>;

  constructor(
    public readonly identifier: string,
    public readonly urlData: AssetUrlData,
    public readonly otrKey?: Uint8Array,
    public readonly sha256?: Uint8Array,
  ) {
    this.downloadProgress = ko.observable(0);
    this.cancelDownload = () => {};
  }

  /**
   * Will generate a v3 or v4 (depending on the given domain) asset payload.
   * Assets v3 and v4 only differ by the domain, so it doesn't make sense to split those into 2 different methods
   */
  static v3(
    assetKey: string,
    assetDomain?: string,
    otrKey?: Uint8Array,
    sha256?: Uint8Array,
    assetToken?: string,
    forceCaching: boolean = false,
  ) {
    const baseProperties: AssetUrlDataVersion3 = {
      assetKey,
      assetToken,
      forceCaching,
      version: 3,
    };
    const urlData = assetDomain
      ? ({
          ...baseProperties,
          assetDomain,
          version: 4,
        } as AssetUrlDataVersion4)
      : baseProperties;
    return new AssetRemoteData(assetKey, urlData, otrKey, sha256);
  }

  static v2(
    conversationId: string,
    assetId: string,
    otrKey: Uint8Array,
    sha256: Uint8Array,
    forceCaching: boolean = false,
  ) {
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

  static v1(conversationId: string, assetId: string, forceCaching: boolean = false) {
    return new AssetRemoteData(`${conversationId}${assetId}`, {
      assetId,
      conversationId,
      forceCaching,
      version: 1,
    });
  }
}
