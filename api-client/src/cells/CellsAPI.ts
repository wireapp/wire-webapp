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
  RestIncomingNode,
  RestNodeLocator,
  RestActionOptionsCopyMove,
  RestNamespaceValuesResponse,
  GetByUuidFlagsEnum,
} from 'cells-sdk-ts';
import logdown from 'logdown';

import {LogFactory} from '@wireapp/commons';

import {Node, NodeVersions, RestNodeSchema, RestNodeVersionsSchema} from './CellsAPI.schema';
import {CellsStorage} from './CellsStorage/CellsStorage';
import {S3Service} from './CellsStorage/S3Service';

import {AccessTokenStore} from '../auth';
import {HttpClient} from '../http';

export type SortDirection = 'asc' | 'desc';

const CONFIGURATION_ERROR = 'CellsAPI is not initialized. Call initialize() before using any methods.';
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const USER_META_TAGS_NAMESPACE = 'usermeta-tags';

// TODO: remove the apiKey (from pydio and s3) once the Pydio backend has fully support for the auth with the Wire's access token
// If it's passed we use it to authenticate, instead of the access token
interface CellsConfig {
  pydio: {
    apiKey?: string;
    segment: string;
    url: string;
  };
  s3: {
    apiKey?: string;
    bucket: string;
    endpoint: string;
    region: string;
  };
}

export class CellsAPI {
  private readonly logger: logdown.Logger;
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
    this.logger = LogFactory.getLogger('@wireapp/api-client/CellsAPI');
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
    const http = httpClient || this.getHttpClient({cellsConfig});

    this.storageService =
      storageService ||
      new S3Service({
        config: cellsConfig.s3,
        accessTokenStore: this.accessTokenStore,
      });
    this.client = new NodeServiceApi(undefined, undefined, http.client);
  }

  private getHttpClient({cellsConfig}: {cellsConfig: CellsConfig}) {
    const baseHttpClientConfig = {
      ...this.httpClientConfig,
      urls: {...this.httpClientConfig.urls, rest: cellsConfig.pydio.url + cellsConfig.pydio.segment},
      headers: {...this.httpClientConfig.headers},
    };

    if (cellsConfig.pydio.apiKey) {
      return new HttpClient(
        {
          ...baseHttpClientConfig,
          headers: {...baseHttpClientConfig.headers, Authorization: `Bearer ${cellsConfig.pydio.apiKey}`},
        },
        this.accessTokenStore,
      );
    }

    const http = new HttpClient(baseHttpClientConfig, this.accessTokenStore);

    // Add axios interceptor to automatically add Authorization header to every request
    // Althouht the HttpClient handles the authorization already (see _sendRequest), as we pass a custom axios instance to the NodeServiceApi, we need to add it manually
    http.client.interceptors.request.use(config => {
      const accessToken = this.accessTokenStore.getAccessToken();
      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });

    return http;
  }

  async uploadNodeDraft({
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

  async promoteNodeDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestPromoteVersionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.promoteVersion(uuid, versionId, {Publish: true});

    return result.data;
  }

  async deleteNodeDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestDeleteVersionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.deleteVersion(uuid, versionId);

    return result.data;
  }

  async deleteNode({
    uuid,
    permanently = false,
  }: {
    uuid: string;
    permanently?: boolean;
  }): Promise<RestPerformActionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.performAction('delete', {
      Nodes: [{Uuid: uuid}],
      DeleteOptions: {PermanentDelete: permanently},
    });

    return result.data;
  }

  async moveNode({
    currentPath,
    targetPath,
  }: {
    currentPath: RestNodeLocator['Path'];
    targetPath: RestActionOptionsCopyMove['TargetPath'];
  }): Promise<RestPerformActionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.performAction('move', {
      Nodes: [{Path: currentPath}],
      CopyMoveOptions: {TargetIsParent: true, TargetPath: targetPath},
      AwaitStatus: 'Finished',
      AwaitTimeout: '5000ms',
    });

    return result.data;
  }

  async restoreNode({uuid}: {uuid: string}): Promise<RestPerformActionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.performAction('restore', {Nodes: [{Uuid: uuid}]});

    return result.data;
  }

  async renameNode({currentPath, newName}: {currentPath: string; newName: string}): Promise<RestPerformActionResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const basePath = currentPath.split('/').slice(0, -1).join('/');
    const newPath = `${basePath}/${newName}`;

    const result = await this.client.performAction('move', {
      Nodes: [{Path: currentPath}],
      CopyMoveOptions: {TargetIsParent: false, TargetPath: newPath},
      AwaitStatus: 'Finished',
      AwaitTimeout: '5000ms',
    });

    return result.data;
  }

  async lookupNodeByPath({path}: {path: string}): Promise<RestNode | undefined> {
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

  async lookupNodeByUuid({uuid}: {uuid: string}): Promise<RestNode | undefined> {
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

  async getNodeVersions({uuid, flags}: {uuid: string; flags?: Array<GetByUuidFlagsEnum>}): Promise<NodeVersions> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.nodeVersions(uuid, {FilterBy: 'VersionsAll', Flags: flags});

    const validation = RestNodeVersionsSchema.safeParse(result.data.Versions);

    if (!validation.success) {
      this.logger.warn('Get node versions response validation failed:', validation.error);
    }

    return result.data.Versions || [];
  }

  async getNode({id, flags}: {id: string; flags?: Array<GetByUuidFlagsEnum>}): Promise<Node> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.getByUuid(id, flags);

    const validation = RestNodeSchema.safeParse(result.data);

    if (!validation.success) {
      this.logger.warn('Get node response validation failed:', validation.error);
    }

    return result.data;
  }

  async getAllNodes({
    path,
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    sortBy,
    sortDirection,
    type,
    deleted = false,
  }: {
    path: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: SortDirection;
    type?: RestIncomingNode['Type'];
    deleted?: boolean;
  }): Promise<RestNodeCollection> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const request: RestLookupRequest = {
      Scope: {Root: {Path: path}},
      Flags: ['WithPreSignedURLs'],
      Limit: `${limit}`,
      Offset: `${offset}`,
      Filters: {
        Type: type || 'UNKNOWN',
        Status: {
          Deleted: deleted ? 'Only' : 'Not',
        },
      },
      SortField: sortBy,
      SortDirDesc: sortDirection ? sortDirection === 'desc' : undefined,
    };

    const result = await this.client.lookup(request);

    return result.data;
  }

  async searchNodes({
    phrase,
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    sortBy,
    sortDirection,
    type,
    tags,
    deleted = false,
  }: {
    phrase: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: SortDirection;
    type?: RestIncomingNode['Type'];
    tags?: string[];
    deleted?: boolean;
  }): Promise<RestNodeCollection> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const request: RestLookupRequest = {
      Scope: {Root: {Path: '/'}, Recursive: true},
      Filters: {
        Text: {SearchIn: 'BaseName', Term: phrase},
        Type: type || 'UNKNOWN',
        Status: {
          Deleted: deleted ? 'Only' : 'Not',
        },
        Metadata: tags?.length ? [{Namespace: USER_META_TAGS_NAMESPACE, Term: this.transformTagsToJson(tags)}] : [],
      },
      Flags: ['WithPreSignedURLs'],
      Limit: `${limit}`,
      Offset: `${offset}`,
      SortField: sortBy,
      SortDirDesc: sortDirection ? sortDirection === 'desc' : undefined,
    };

    const result = await this.client.lookup(request);

    return result.data;
  }

  private async createNode({
    path,
    uuid,
    type,
    versionId = '',
  }: {
    path: NonNullable<RestNodeLocator['Path']>;
    uuid: NonNullable<RestIncomingNode['ResourceUuid']>;
    type: RestIncomingNode['Type'];
    versionId?: RestIncomingNode['VersionId'];
  }): Promise<RestNodeCollection> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const response = await this.client.create({
      Inputs: [
        {
          Type: type,
          Locator: {Path: path.normalize('NFC')},
          ResourceUuid: uuid,
          VersionId: versionId,
        },
      ],
    });

    return response.data;
  }

  async createFile({
    path,
    uuid,
    versionId,
  }: {
    path: NonNullable<RestNodeLocator['Path']>;
    uuid: NonNullable<RestIncomingNode['ResourceUuid']>;
    versionId: NonNullable<RestIncomingNode['VersionId']>;
  }): Promise<RestNodeCollection> {
    return this.createNode({
      path,
      uuid,
      type: 'LEAF',
      versionId,
    });
  }

  async createFolder({
    path,
    uuid,
  }: {
    path: NonNullable<RestNodeLocator['Path']>;
    uuid: NonNullable<RestIncomingNode['ResourceUuid']>;
  }): Promise<RestNodeCollection> {
    return this.createNode({
      path,
      uuid,
      type: 'COLLECTION',
    });
  }

  async deleteNodePublicLink({uuid}: {uuid: string}): Promise<RestPublicLinkDeleteSuccess> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.deletePublicLink(uuid);

    return result.data;
  }

  async createNodePublicLink({uuid, label}: {uuid: string; label?: string}): Promise<RestShareLink> {
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

  async getNodePublicLink({uuid}: {uuid: string}): Promise<RestShareLink> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.getPublicLink(uuid);

    return result.data;
  }

  async getAllTags(): Promise<RestNamespaceValuesResponse> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.listNamespaceValues(USER_META_TAGS_NAMESPACE);

    return result.data;
  }

  async setNodeTags({uuid, tags}: {uuid: string; tags: string[]}): Promise<RestNode> {
    if (!this.client || !this.storageService) {
      throw new Error(CONFIGURATION_ERROR);
    }

    const result = await this.client.patchNode(uuid, {
      MetaUpdates: [
        {
          Operation: tags.length > 0 ? 'PUT' : 'DELETE',
          UserMeta: {Namespace: USER_META_TAGS_NAMESPACE, JsonValue: this.transformTagsToJson(tags)},
        },
      ],
    });

    return result.data;
  }

  private transformTagsToJson(tags: string[]): string {
    return JSON.stringify(tags.join(','));
  }
}
