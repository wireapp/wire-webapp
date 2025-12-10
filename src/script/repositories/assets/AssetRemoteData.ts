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

import {AssetUrlData} from '@wireapp/core/lib/conversation/AssetService/AssetService';

/**
 * Callback function that receives download progress updates.
 * @param progress - Download progress as a percentage (0-100)
 */
export type ProgressCallback = (progress: number) => void;

export type AssetRemoteDataParams = {
  assetKey: string;
  assetDomain: string;
  otrKey?: Uint8Array;
  sha256?: Uint8Array;
  assetToken?: string;
  forceCaching?: boolean;
};

/**
 * Represents remote asset data with encryption and download tracking capabilities.
 */
export class AssetRemoteData {
  public cancelDownload: () => void = () => {};
  private progress: number = 0;
  private progressCallback?: ProgressCallback;
  public readonly forceCaching: boolean;
  private readonly assetKey: string;
  private readonly assetDomain: string;
  public readonly otrKey?: Uint8Array;
  public readonly sha256?: Uint8Array;
  public readonly assetToken?: string;

  /**
   * Creates an instance of AssetRemoteData
   *
   * @param assetKey - Unique identifier for the asset
   * @param assetDomain - Domain where the asset is hosted (for federated assets)
   * @param otrKey - Optional OTR encryption key for decrypting the asset
   * @param sha256 - Optional SHA-256 hash for integrity verification
   * @param assetToken - Optional authentication token for accessing the asset
   * @param forceCaching - Whether to force caching of the asset (default: false)
   */
  constructor(params: AssetRemoteDataParams) {
    this.assetKey = params.assetKey;
    this.assetDomain = params.assetDomain;
    this.otrKey = params.otrKey;
    this.sha256 = params.sha256;
    this.assetToken = params.assetToken;
    this.forceCaching = params.forceCaching ?? false;
  }

  /**
   * Returns the URL data needed to fetch this asset.
   */
  get urlData(): AssetUrlData {
    return {
      assetKey: this.assetKey,
      assetToken: this.assetToken,
      assetDomain: this.assetDomain,
      forceCaching: this.forceCaching,
    };
  }

  /**
   * Returns the identifier for this asset (same as assetKey).
   */
  get identifier(): string {
    return this.assetKey;
  }

  /**
   * Sets a callback to be called when download progress changes.
   * This replaces the KO observable pattern with a callback-based approach.
   *
   * @param callback - Function to call with progress updates (0-100)
   */
  public onProgressChange(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Updates the download progress and notifies any registered callback.
   * This is called internally by the AssetRepository during downloads.
   *
   * @param progress - Download progress as a percentage (0-100)
   */
  public updateProgress(progress: number): void {
    this.progress = progress;
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  public get downloadProgress(): number {
    return this.progress;
  }
}
