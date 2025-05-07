/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {
  NodeServiceApi,
  RestLookupRequest,
  RestCreateCheckResponse,
  RestDeleteVersionResponse,
  RestNode,
  RestNodeCollection,
  RestPerformActionResponse,
  RestPromoteVersionResponse,
  RestPublicLinkDeleteSuccess,
  RestShareLink,
  RestVersion,
} from 'cells-sdk-ts';

import {CellsStorage} from './CellsStorage/CellsStorage';
import {S3Service} from './CellsStorage/S3Service';

import {AccessTokenStore} from '../auth';
import {HttpClient} from '../http';

export type SortDirection = 'asc' | 'desc';

const CONFIGURATION_ERROR = 'CellsAPI is not initialized. Call initialize() before using any methods.';
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const DEFAULT_SEARCH_SORT_FIELD = 'mtime';
const DEFAULT_SEARCH_SORT_DIRECTION: SortDirection = 'desc';

interface CellsConfig {
  pydio: {
    apiKey: string;
    segment: string;
    url: string;
  };
  s3: {
    apiKey: string;
    bucket: string;
    endpoint: string;
    region: string;
  };
}

export class CellsAPI {
  private accessTokenStore: AccessTokenStore;
  private httpClientConfig: HttpClient['config'];
  private storageService: CellsStorage | null;
  private client: NodeServiceApi | null;

  constructor({
    accessTokenStore,
    httpClientConfig,
  }: {
    accessTokenStore: AccessTokenStore;
    httpClientConfig: HttpClient['config'];
  }) {
    this.accessTokenStore = accessTokenStore;
    this.httpClientConfig = httpClientConfig;
    this.storageService = null;
    this.client = null;
  }

  initialize({
    cellsConfig,
    httpClient,
    storageService,
  }: {
    cellsConfig: CellsConfig;
    httpClient?: HttpClient;
    storageService?: CellsStorage;
  }) {
    const http =
      httpClient ||
      new HttpClient(
        {
          ...this.httpClientConfig,
          urls: {...this.httpClientConfig.urls, rest: cellsConfig.pydio.url + cellsConfig.pydio.segment},
          headers: {...this.httpClientConfig.headers, Authorization: `Bearer ${cellsConfig.pydio.apiKey}`},
        },
        this.accessTokenStore,
      );

    this.storageService = storageService || new S3Service(cellsConfig.s3);
    this.client = new NodeServiceApi(undefined, undefined, http.client);
  }

  async uploadFileDraft({
    uuid,
    versionId,
    path,
    file,
    autoRename = true,
    progressCallback,
    abortController,
  }: {
    uuid: string;
    versionId: string;
    path: string;
    file: File;
    autoRename?: boolean;
    progressCallback?: (progress: number) => void;
    abortController?: AbortController;
  }): Promise<RestCreateCheckResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    let filePath = `${path}`.normalize('NFC');

    const result = await this.client.createCheck(
      {
        Inputs: [{Type: 'LEAF', Locator: {Path: filePath, Uuid: uuid}, VersionId: versionId}],
        FindAvailablePath: true,
      },
      {signal: abortController?.signal},
    );

    if (autoRename && result.data.Results?.length && result.data.Results[0].Exists) {
      filePath = result.data.Results[0].NextPath || filePath;
    }

    const metadata = {
      'Draft-Mode': 'true',
      'Create-Resource-Uuid': uuid,
      'Create-Version-Id': versionId,
    };

    await this.storageService.putObject({path: filePath, file, metadata, progressCallback, abortController});

    return result.data;
  }

  async promoteFileDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestPromoteVersionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.promoteVersion(uuid, versionId, {Publish: true});

    return result.data;
  }

  async deleteFileDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestDeleteVersionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.deleteVersion(uuid, versionId);

    return result.data;
  }

  async deleteFile({uuid}: {uuid: string}): Promise<RestPerformActionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.performAction('delete', {Nodes: [{Uuid: uuid}]});

    return result.data;
  }

  async lookupFileByPath({path}: {path: string}): Promise<RestNode | undefined> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.lookup({
      Scope: {Nodes: [{Path: path}]},
      Flags: ['WithPreSignedURLs'],
    });

    const node = result.data.Nodes?.[0];

    if (!node) {
      throw new Error(`File not found: ${path}`);
    }

    return node;
  }

  async lookupFileByUuid({uuid}: {uuid: string}): Promise<RestNode | undefined> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.lookup({
      Scope: {Nodes: [{Uuid: uuid}]},
      Flags: ['WithPreSignedURLs'],
    });

    const node = result.data.Nodes?.[0];

    if (!node) {
      throw new Error(`File not found: ${uuid}`);
    }

    return node;
  }

  async getFileVersions({uuid}: {uuid: string}): Promise<RestVersion[] | undefined> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.nodeVersions(uuid, {FilterBy: 'VersionsAll'});

    return result.data.Versions;
  }

  async getFile({id}: {id: string}): Promise<RestNode> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.getByUuid(id);

    return result.data;
  }

  async getAllFiles({
    path,
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    sortBy = DEFAULT_SEARCH_SORT_FIELD,
    sortDirection = DEFAULT_SEARCH_SORT_DIRECTION,
  }: {
    path: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: SortDirection;
  }): Promise<RestNodeCollection> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const request: RestLookupRequest = {
      Scope: {Root: {Path: path}},
      Flags: ['WithPreSignedURLs'],
      Limit: `${limit}`,
      Offset: `${offset}`,
    };

    if (sortBy) {
      request.SortField = sortBy;
      request.SortDirDesc = sortDirection === 'desc';
    }

    const result = await this.client.lookup(request);

    return result.data;
  }

  async searchFiles({
    phrase,
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    sortBy = DEFAULT_SEARCH_SORT_FIELD,
    sortDirection = DEFAULT_SEARCH_SORT_DIRECTION,
  }: {
    phrase: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: SortDirection;
  }): Promise<RestNodeCollection> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const request: RestLookupRequest = {
      Scope: {Root: {Path: '/'}, Recursive: true},
      Filters: {
        Text: {SearchIn: 'BaseName', Term: phrase},
      },
      Flags: ['WithPreSignedURLs'],
      Limit: `${limit}`,
      Offset: `${offset}`,
    };
    if (sortBy) {
      request.SortField = sortBy;
      request.SortDirDesc = sortDirection === 'desc';
    }

    const result = await this.client.lookup(request);

    return result.data;
  }

  async deleteFilePublicLink({uuid}: {uuid: string}): Promise<RestPublicLinkDeleteSuccess> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.deletePublicLink(uuid);

    return result.data;
  }

  async createFilePublicLink({uuid, label}: {uuid: string; label?: string}): Promise<RestShareLink> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.createPublicLink(uuid, {
      Link: {
        Label: label,
        Permissions: ['Preview', 'Download'],
      },
    });

    return result.data;
  }

  async getFilePublicLink({uuid}: {uuid: string}): Promise<RestShareLink> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.getPublicLink(uuid);

    return result.data;
  }
}
