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

@singleton()
export class CellsRepository {
  private readonly basePath = 'wire-cells-web';
  private isInitialized = false;
  private config: CellsConfig | null = null;

  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  initialize(config: CellsConfig) {
    if (this.isInitialized) {
      return;
    }
    this.config = config;
    this.isInitialized = true;
    return this.apiClient.api.cells.initialize({cellsConfig: config});
  }

  private ensureInitialized() {
    if (!this.isInitialized || !this.config) {
      throw new Error('CellsRepository not initialized. Call initialize() first.');
    }
    return this.apiClient.api.cells.initialize({cellsConfig: this.config});
  }

  async uploadFile(file: File): Promise<{uuid: string; versionId: string}> {
    this.ensureInitialized();
    const path = `${this.basePath}/${encodeURIComponent(file.name)}`;

    const uuid = createUuid();
    const versionId = createUuid();

    await this.apiClient.api.cells.uploadFileDraft({
      path,
      file,
      uuid,
      versionId,
    });

    return {
      uuid,
      versionId,
    };
  }

  async deleteFileDraft({uuid, versionId}: {uuid: string; versionId: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.deleteFileDraft({uuid, versionId});
  }

  async deleteFile({uuid}: {uuid: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.deleteFile({uuid});
  }

  async getAllFiles({path}: {path: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.getAllFiles({path: path || this.basePath});
  }

  async createPublicLink({uuid, label}: {uuid: string; label?: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.createFilePublicLink({
      uuid,
      label,
    });
  }

  async getPublicLink({uuid}: {uuid: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.getFilePublicLink({uuid});
  }

  async deletePublicLink({uuid}: {uuid: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.deleteFilePublicLink({uuid});
  }

  async searchFiles({query}: {query: string}) {
    this.ensureInitialized();
    return this.apiClient.api.cells.searchFiles({phrase: query});
  }
}
