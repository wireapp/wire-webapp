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

import axios from 'axios';
import {NodeServiceApi, RestNode, RestNodeCollection} from 'cells-sdk-ts';
import {v4 as uuidv4} from 'uuid';

import {S3Service} from './S3Service';
import {StorageService} from './StorageService';

const basePath = 'https://service.zeta.pydiocells.com';
const restSegment = '/v2';
const apiKey = 'eM8QjBiLTfDK9-YZWYkQHSqx4bjU_8H4XKLmhraXnM4.vG_WHXs4fOwklIvwQlrGkxTiSuJiEDzU1i3SOa-mNW8';
const s3Bucket = 'io';
const s3Url = 'https://service.zeta.pydiocells.com';

export class CellsAPI {
  private readonly storageService: StorageService;
  private readonly client: NodeServiceApi;

  constructor() {
    this.storageService = new S3Service({apiKey, s3URL: s3Url, bucketName: s3Bucket});

    const instance = axios.create({
      baseURL: basePath + restSegment,
      timeout: 60000,
      headers: {Authorization: `Bearer ${apiKey}`},
    });

    this.client = new NodeServiceApi(undefined, undefined, instance);
  }

  async uploadFile({
    filePath,
    file,
    autoRename = true,
  }: {
    filePath: string;
    file: File;
    autoRename?: boolean;
  }): Promise<void> {
    let path = `/${filePath}`.normalize('NFC');

    const result = await this.client.createCheck({
      Inputs: [{Type: 'LEAF', Locator: {Path: path}}],
      FindAvailablePath: true,
    });

    if (autoRename && result.data.Results?.length && result.data.Results[0].Exists) {
      path = result.data.Results[0].NextPath || path;
    }

    const metadata = {
      'Draft-Mode': 'true',
      'Create-Resource-Uuid': uuidv4(),
      'Create-Version-Id': uuidv4(),
    };

    await this.storageService.putObject({filePath: path, file, metadata});
  }

  async getFile(id: string): Promise<RestNode> {
    const result = await this.client.getByUuid(id);

    return result.data;
  }

  async getAllFiles(): Promise<RestNodeCollection> {
    const result = await this.client.lookup({
      Locators: {Many: [{Path: `/*`}]},
      Flags: ['WithVersionsAll'],
    });

    return result.data;
  }

  async deleteFile(path: string): Promise<void> {
    await this.client.performAction('delete', {Nodes: [{Path: path}]});
  }

  async createFile({name, path = ''}: {name: string; path?: string}): Promise<void> {
    await this.client.create({
      Inputs: [
        {
          Type: 'LEAF',
          Locator: {Path: `${path}/${name.normalize('NFC')}`},
          DraftMode: true,
          ResourceUuid: uuidv4(),
          VersionId: uuidv4(),
        },
      ],
    });
  }

  async createFolder({name, path = ''}: {name: string; path?: string}): Promise<void> {
    await this.client.create({
      Inputs: [
        {
          Type: 'COLLECTION',
          Locator: {Path: `${path}/${name.normalize('NFC')}`},
          DraftMode: true,
          ResourceUuid: uuidv4(),
          VersionId: '',
        },
      ],
    });
  }
}
