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

import {container} from 'tsyringe';

import {createUuid} from 'Util/uuid';

import {APIClient} from '../service/APIClientSingleton';

export class CellsRepository {
  private readonly basePath = 'wire-cells-web';
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  async uploadFile(file: File): Promise<{uuid: string; versionId: string}> {
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
    return this.apiClient.api.cells.deleteFileDraft({uuid, versionId});
  }

  async deleteFile({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.deleteFile({uuid});
  }

  async getAllFiles() {
    return this.apiClient.api.cells.getAllFiles({path: this.basePath});
  }

  async getPublicLink({uuid, label}: {uuid: string; label: string}) {
    return this.apiClient.api.cells.createFilePublicLink({
      uuid,
      label,
    });
  }

  async deletePublicLink({uuid}: {uuid: string}) {
    return this.apiClient.api.cells.deleteFilePublicLink({uuid});
  }

  async searchFiles({query}: {query: string}) {
    return this.apiClient.api.cells.searchFiles({phrase: query});
  }
}
