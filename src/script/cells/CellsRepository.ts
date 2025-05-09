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

import {APIClient} from '../service/APIClientSingleton';

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

const DEFAULT_MAX_FILES_LIMIT = 100;
const SEARCH_DEFAULT_SORT_FIELD = 'mtime';
const SEARCH_DEFAULT_SORT_DIR = 'desc';

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

  async uploadFile({
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
      await this.apiClient.api.cells.uploadFileDraft({
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

  async deleteFileDraft({uuid, versionId}: {uuid: string; versionId: string}) {
    return this.apiClient.api.cells.deleteFileDraft({uuid, versionId});
  }

  async deleteFile({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.deleteFile({uuid});
  }

  async getAllFiles({
    path,
    limit = DEFAULT_MAX_FILES_LIMIT,
    offset = 0,
  }: {
    path: string;
    limit?: number;
    offset?: number;
  }) {
    return this.apiClient.api.cells.getAllFiles({
      path: path || this.basePath,
      limit,
      offset,
      sortBy: SEARCH_DEFAULT_SORT_FIELD,
      sortDirection: SEARCH_DEFAULT_SORT_DIR,
    });
  }

  async getFile({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.getFile({id: uuid});
  }

  async createPublicLink({uuid, label}: {uuid: string; label?: string}) {
    return this.apiClient.api.cells.createFilePublicLink({
      uuid,
      label,
    });
  }

  async getPublicLink({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.getFilePublicLink({uuid});
  }

  async deletePublicLink({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.deleteFilePublicLink({uuid});
  }

  async searchFiles({query, limit = DEFAULT_MAX_FILES_LIMIT}: {query: string; limit?: number}) {
    return this.apiClient.api.cells.searchFiles({
      phrase: query,
      limit,
      sortBy: SEARCH_DEFAULT_SORT_FIELD,
      sortDirection: SEARCH_DEFAULT_SORT_DIR,
    });
  }

  async promoteFileDraft({uuid, versionId}: {uuid: string; versionId: string}) {
    return this.apiClient.api.cells.promoteFileDraft({uuid, versionId});
  }
}
