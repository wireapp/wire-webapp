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

import {container, singleton} from 'tsyringe';

import {createUuid} from 'Util/uuid';

import {APIClient} from '../../service/APIClientSingleton';

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

const DEFAULT_MAX_FILES_LIMIT = 100;

@singleton()
export class CellsRepository {
  private readonly basePath = 'wire-cells-web';
  private isInitialized = false;
  private uploadControllers: Map<string, AbortController> = new Map();

  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  initialize(config: CellsConfig) {
    if (this.isInitialized) {
      return;
    }

    this.apiClient.api.cells.initialize({cellsConfig: config});
    this.isInitialized = true;
  }

  async uploadNodeDraft({
    uuid,
    file,
    path,
    progressCallback,
  }: {
    uuid: string;
    file: File;
    path: string;
    progressCallback?: (progress: number) => void;
  }): Promise<{uuid: string; versionId: string}> {
    const filePath = `${path || this.basePath}/${file.name}`;
    const versionId = createUuid();

    const controller = new AbortController();
    this.uploadControllers.set(uuid, controller);

    try {
      await this.apiClient.api.cells.uploadNodeDraft({
        path: filePath,
        file,
        uuid,
        versionId,
        progressCallback,
        abortController: controller,
      });

      return {
        uuid,
        versionId,
      };
    } finally {
      this.uploadControllers.delete(uuid);
    }
  }

  cancelUpload(uuid: string): void {
    const controller = this.uploadControllers.get(uuid);
    if (controller) {
      controller.abort();
    }
  }

  async deleteNodeDraft({uuid, versionId}: {uuid: string; versionId: string}) {
    return this.apiClient.api.cells.deleteNodeDraft({uuid, versionId});
  }

  async deleteNode({uuid, permanently = false}: {uuid: string; permanently?: boolean}) {
    return this.apiClient.api.cells.deleteNode({uuid, permanently});
  }

  async deleteNodes({uuids, permanently = false}: {uuids: string[]; permanently?: boolean}) {
    uuids.forEach(async uuid => {
      await this.deleteNode({uuid, permanently});
    });
  }

  async moveNode({currentPath, targetPath}: {currentPath: string; targetPath: string}) {
    return this.apiClient.api.cells.moveNode({currentPath, targetPath});
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
  }) {
    return this.apiClient.api.cells.getAllNodes({
      path: path || this.basePath,
      limit,
      offset,
      sortBy,
      sortDirection,
      ...(type ? {type: type === 'file' ? 'LEAF' : 'COLLECTION'} : {}),
      deleted,
    });
  }

  async getNode({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.getNode({id: uuid});
  }

  async lookupNodeByPath({path}: {path: string}) {
    return this.apiClient.api.cells.lookupNodeByPath({path});
  }

  async createFolder({path, name}: {path: string; name: string}) {
    const filePath = `${path || this.basePath}/${name}`;
    const uuid = createUuid();

    return this.apiClient.api.cells.createFolder({path: filePath, uuid});
  }

  async createFile({path, name}: {path: string; name: string}) {
    const filePath = `${path || this.basePath}/${name}`;
    const uuid = createUuid();
    const versionId = createUuid();

    return this.apiClient.api.cells.createFile({path: filePath, uuid, versionId});
  }

  async createPublicLink({uuid, label}: {uuid: string; label?: string}) {
    return this.apiClient.api.cells.createNodePublicLink({
      uuid,
      label,
    });
  }

  async getPublicLink({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.getNodePublicLink({uuid});
  }

  async deletePublicLink({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.deleteNodePublicLink({uuid});
  }

  async searchNodes({
    query,
    limit = DEFAULT_MAX_FILES_LIMIT,
    tags,
    sortBy,
    sortDirection,
  }: {
    query: string;
    limit?: number;
    tags?: string[];
    sortBy?: SortBy;
    sortDirection?: SortDirection;
  }) {
    return this.apiClient.api.cells.searchNodes({
      phrase: query,
      limit,
      sortBy,
      sortDirection,
      tags,
    });
  }

  async promoteNodeDraft({uuid, versionId}: {uuid: string; versionId: string}) {
    return this.apiClient.api.cells.promoteNodeDraft({uuid, versionId});
  }

  async restoreNode({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.restoreNode({uuid});
  }

  async renameNode({currentPath, newName}: {currentPath: string; newName: string}) {
    return this.apiClient.api.cells.renameNode({currentPath, newName});
  }

  async getAllTags() {
    return this.apiClient.api.cells.getAllTags();
  }

  async setNodeTags({uuid, tags}: {uuid: string; tags: string[]}) {
    return this.apiClient.api.cells.setNodeTags({uuid, tags});
  }
}
