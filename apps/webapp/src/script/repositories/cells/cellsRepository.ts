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

import {isNonEmptyString, isNullOrUndefined, isTruthy} from '@sindresorhus/is';
import {NodeFlags, RestShareLink} from '@wireapp/api-client/lib/cells';
import type {Node as CellsNode, NodeVersions} from '@wireapp/api-client/lib/cells/cellsApi.schema';
import type {
  RestBackgroundAction,
  RestDeleteVersionResponse,
  RestNamespaceValuesResponse,
  RestNode,
  RestNodeCollection,
  RestPerformActionResponse,
  RestPromoteVersionResponse,
  RestPublicLinkDeleteSuccess,
} from 'cells-sdk-ts';
import {container, singleton} from 'tsyringe';

import {createUuid} from 'Util/uuid';

import {APIClient} from '../../service/apiClientSingleton';

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

// Currently, the cells backend doesn't specify the sortable fields (they're dynamic).
// When backend will specify the exact fields, we'll update this type.
// The "(string & {})" indicates that all strings are valid, but we get autocomplete for the union values.
type SortBy = 'mtime' | (string & {});
type SortDirection = 'asc' | 'desc';
type UploadedNodeVersion = {uuid: string; versionId: string};

const DEFAULT_MAX_FILES_LIMIT = 100;

@singleton()
export class CellsRepository {
  private readonly basePath = 'wire-cells-web';
  private isInitialized = false;
  private uploadControllers: Map<string, AbortController> = new Map();

  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  initialize(config: CellsConfig): void {
    if (this.isInitialized) {
      return;
    }

    this.apiClient.api.cells.initialize({cellsConfig: config});
    this.isInitialized = true;
  }

  async uploadNode({
    uuid,
    file,
    path,
    versionId = createUuid(),
    progressCallback,
    abortController,
  }: {
    uuid: string;
    file: File;
    path: string;
    versionId?: string;
    progressCallback?: (progress: number) => void;
    abortController?: AbortController;
  }): Promise<UploadedNodeVersion> {
    const uploadFilePath = isNonEmptyString(file.webkitRelativePath) ? file.webkitRelativePath : file.name;
    const filePath = `${isNonEmptyString(path) ? path : this.basePath}/${uploadFilePath}`;

    await this.apiClient.api.cells.uploadNode({
      path: filePath,
      file,
      uuid,
      versionId,
      progressCallback,
      abortController,
    });

    return {uuid, versionId};
  }

  async uploadNodeDraft({
    uuid,
    file,
    path,
    versionId = createUuid(),
    progressCallback,
    abortController,
  }: {
    uuid: string;
    file: File;
    path: string;
    versionId?: string;
    progressCallback?: (progress: number) => void;
    abortController?: AbortController;
  }): Promise<UploadedNodeVersion> {
    const uploadFilePath = isNonEmptyString(file.webkitRelativePath) ? file.webkitRelativePath : file.name;
    const filePath = `${isNonEmptyString(path) ? path : this.basePath}/${uploadFilePath}`;
    const controller = abortController ?? new AbortController();
    if (isNullOrUndefined(abortController)) {
      this.uploadControllers.set(uuid, controller);
    }

    try {
      await this.apiClient.api.cells.uploadNodeDraft({
        path: filePath,
        file,
        uuid,
        versionId,
        progressCallback,
        abortController: controller,
      });

      return {uuid, versionId};
    } finally {
      if (isNullOrUndefined(abortController) && this.uploadControllers.get(uuid) === controller) {
        this.uploadControllers.delete(uuid);
      }
    }
  }

  cancelUpload(uuid: string): void {
    this.uploadControllers.get(uuid)?.abort();
  }

  async deleteNodeDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestDeleteVersionResponse> {
    return this.apiClient.api.cells.deleteNodeDraft({uuid, versionId});
  }

  async deleteNode({
    uuid,
    permanently = false,
  }: {
    uuid: string;
    permanently?: boolean;
  }): Promise<RestPerformActionResponse> {
    return this.apiClient.api.cells.deleteNode({uuid, permanently});
  }

  async deleteNodes({uuids, permanently = false}: {uuids: string[]; permanently?: boolean}): Promise<void> {
    uuids.forEach(async uuid => {
      await this.deleteNode({uuid, permanently});
    });
  }

  async moveNode({
    currentPath,
    targetPath,
  }: {
    currentPath: string;
    targetPath: string;
  }): Promise<RestPerformActionResponse> {
    return this.apiClient.api.cells.moveNode({currentPath, targetPath});
  }

  async moveNodes({
    currentPaths,
    targetPath,
  }: {
    currentPaths: string[];
    targetPath: string;
  }): Promise<RestPerformActionResponse> {
    return this.apiClient.api.cells.moveNodes({currentPaths, targetPath});
  }

  async getBackgroundMoveInfo({jobUuid}: {jobUuid: string}): Promise<RestBackgroundAction> {
    return this.apiClient.api.cells.getBackgroundActionInfo({name: 'move', jobUuid});
  }

  async getAllNodes({
    path,
    limit = DEFAULT_MAX_FILES_LIMIT,
    offset = 0,
    type,
    sortBy,
    sortDirection,
    deleted = false,
  }: {
    path: string;
    limit?: number;
    offset?: number;
    type?: 'file' | 'folder';
    sortBy?: SortBy;
    sortDirection?: SortDirection;
    deleted?: boolean;
  }): Promise<RestNodeCollection> {
    return this.apiClient.api.cells.getAllNodes({
      path: isNonEmptyString(path) ? path : this.basePath,
      limit,
      offset,
      sortBy,
      sortDirection,
      ...(isNonEmptyString(type) ? {type: type === 'file' ? 'LEAF' : 'COLLECTION'} : {}),
      deleted,
    });
  }

  async getNode({uuid, flags}: {uuid: string; flags?: NodeFlags[]}): Promise<CellsNode> {
    return this.apiClient.api.cells.getNode({id: uuid, flags});
  }

  async getNodeVersions({uuid, flags}: {uuid: string; flags?: NodeFlags[]}): Promise<NodeVersions> {
    return this.apiClient.api.cells.getNodeVersions({uuid, flags});
  }

  async lookupNodeByPath({path}: {path: string}): Promise<RestNode | undefined> {
    return this.apiClient.api.cells.lookupNodeByPath({path});
  }

  async createFolder({path, name}: {path: string; name: string}): Promise<RestNodeCollection> {
    const filePath = `${isNonEmptyString(path) ? path : this.basePath}/${name}`;
    const uuid = createUuid();

    return this.apiClient.api.cells.createFolder({path: filePath, uuid});
  }

  async createFile({
    path,
    name,
    templateUuid,
  }: {
    path: string;
    name: string;
    templateUuid?: string;
  }): Promise<RestNodeCollection> {
    const filePath = `${isNonEmptyString(path) ? path : this.basePath}/${name}`;
    const uuid = createUuid();
    const versionId = createUuid();

    return this.apiClient.api.cells.createFile({path: filePath, uuid, versionId, templateUuid});
  }

  async checkFileAlreadyExists({path, name}: {path: string; name: string}): Promise<boolean> {
    const filePath = `${isNonEmptyString(path) ? path : this.basePath}/${name}`;
    const uuid = createUuid();
    const versionId = createUuid();
    const result = await this.apiClient.api.cells.checkNodeCreation({path: filePath, uuid, versionId, type: 'LEAF'});

    return (
      result.Results?.some(checkResult => {
        return isTruthy(checkResult.Exists);
      }) ?? false
    );
  }

  async createPublicLink({
    uuid,
    link,
    createPassword,
    passwordEnabled,
  }: {
    uuid: string;
    link: RestShareLink;
    createPassword?: string;
    passwordEnabled?: boolean;
  }): Promise<RestShareLink> {
    return this.apiClient.api.cells.createNodePublicLink({
      uuid,
      link,
      createPassword,
      passwordEnabled,
    });
  }

  async getPublicLink({uuid}: {uuid: string}): Promise<RestShareLink> {
    return this.apiClient.api.cells.getNodePublicLink({uuid});
  }

  async deletePublicLink({uuid}: {uuid: string}): Promise<RestPublicLinkDeleteSuccess> {
    return this.apiClient.api.cells.deleteNodePublicLink({uuid});
  }

  async updatePublicLink({
    linkUuid,
    link,
    createPassword,
    updatePassword,
    passwordEnabled,
  }: {
    linkUuid: string;
    link: RestShareLink;
    createPassword?: string;
    updatePassword?: string;
    passwordEnabled?: boolean;
  }): Promise<RestShareLink> {
    return this.apiClient.api.cells.updateNodePublicLink({
      linkUuid,
      link,
      createPassword,
      updatePassword,
      passwordEnabled,
    });
  }

  async searchNodes({
    query,
    recursive,
    limit = DEFAULT_MAX_FILES_LIMIT,
    offset = 0,
    tags,
    mimeTypes,
    hasPublicLink,
    creatorIds,
    path,
    type,
    sortBy,
    sortDirection,
    deleted = false,
  }: {
    query: string;
    recursive?: boolean;
    limit?: number;
    offset?: number;
    tags?: string[];
    mimeTypes?: string[];
    hasPublicLink?: boolean;
    creatorIds?: string[];
    path?: string;
    type?: 'file' | 'folder';
    sortBy?: SortBy;
    sortDirection?: SortDirection;
    deleted?: boolean;
  }): Promise<RestNodeCollection> {
    return this.apiClient.api.cells.searchNodes({
      phrase: query,
      recursive,
      limit,
      offset,
      sortBy,
      sortDirection,
      tags,
      mimeTypes,
      hasPublicLink,
      creatorIds,
      path,
      deleted,
      ...(isNonEmptyString(type) ? {type: type === 'file' ? 'LEAF' : 'COLLECTION'} : {}),
    });
  }

  async promoteNodeDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestPromoteVersionResponse> {
    return this.apiClient.api.cells.promoteNodeDraft({uuid, versionId});
  }

  async restoreNode({uuid}: {uuid: string}): Promise<RestPerformActionResponse> {
    return this.apiClient.api.cells.restoreNode({uuid});
  }

  async renameNode({currentPath, newName}: {currentPath: string; newName: string}): Promise<RestPerformActionResponse> {
    return this.apiClient.api.cells.renameNode({currentPath, newName});
  }

  async getAllTags(): Promise<RestNamespaceValuesResponse> {
    return this.apiClient.api.cells.getAllTags();
  }

  async setNodeTags({uuid, tags}: {uuid: string; tags: string[]}): Promise<RestNode> {
    return this.apiClient.api.cells.setNodeTags({uuid, tags});
  }
}
