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

import {ProgressCallback} from '@wireapp/api-client/lib/http/';
import {singleton, container} from 'tsyringe';

import {legacyAsset, assetV3, isValidApiPath} from 'Util/ValidationUtil';

import {APIClient} from '../service/APIClientSingleton';

@singleton()
export class AssetService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  async generateAssetUrl(assetId: string, conversationId: string, forceCaching: boolean): Promise<string> {
    legacyAsset(assetId, conversationId);

    const path = `/assets/${assetId}`;
    isValidApiPath(path);

    const url = `${this.apiClient.config.urls.rest}${path}`;
    const cachingParam = forceCaching ? '&forceCaching=true' : '';
    const conversationIdParam = `&conv_id=${encodeURIComponent(conversationId)}`;
    return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${conversationIdParam}${cachingParam}`;
  }

  async generateAssetUrlV2(assetId: string, conversationId: string, forceCaching: boolean): Promise<string> {
    legacyAsset(assetId, conversationId);

    const path = `/conversations/${conversationId}/otr/assets/${assetId}`;
    isValidApiPath(path);

    const url = `${this.apiClient.config.urls.rest}${path}`;
    const cachingParam = forceCaching ? '&forceCaching=true' : '';
    return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${cachingParam}`;
  }

  async generateAssetUrlV3(assetKey: string, assetToken: string, forceCaching: boolean): Promise<string> {
    assetV3(assetKey, assetToken);

    const path = `/assets/v3/${assetKey}`;
    isValidApiPath(path);

    const url = `${this.apiClient.config.urls.rest}${path}`;
    const assetTokenParam = assetToken ? `&asset_token=${encodeURIComponent(assetToken)}` : '';
    const cachingParam = forceCaching ? '&forceCaching=true' : '';
    return `${url}?access_token=${this.apiClient['accessTokenStore'].accessToken?.access_token}${assetTokenParam}${cachingParam}`;
  }

  async downloadAssetV1(
    assetId: string,
    conversationId: string,
    forceCaching?: boolean,
    progressCallback?: ProgressCallback,
  ) {
    return this.apiClient.api.asset.getAssetV1(assetId, conversationId, forceCaching, progressCallback);
  }

  async downloadAssetV2(
    assetId: string,
    conversationId: string,
    forceCaching?: boolean,
    progressCallback?: ProgressCallback,
  ) {
    return this.apiClient.api.asset.getAssetV2(assetId, conversationId, forceCaching, progressCallback);
  }

  async downloadAssetV3(assetId: string, token?: string, forceCaching?: boolean, progressCallback?: ProgressCallback) {
    return this.apiClient.api.asset.getAssetV3(assetId, token, forceCaching, progressCallback);
  }
}
