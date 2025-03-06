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

import {Config} from '../Config';
import {HttpClient} from '../http';

export class CellsAPI {
  private readonly storageService: CellsStorage;
  private readonly client: NodeServiceApi;

  constructor({
    httpClient,
    storageService,
    config,
  }: {
    httpClient: HttpClient;
    storageService?: CellsStorage;
    config: NonNullable<Config['cells']>;
  }) {
    this.storageService = storageService || new S3Service(config.s3);

    this.client = new NodeServiceApi(undefined, undefined, httpClient.client);
  }

  async uploadFileDraft({
    uuid,
    versionId,
    path,
    file,
    autoRename = true,
  }: {
    uuid: string;
    versionId: string;
    path: string;
    file: File;
    autoRename?: boolean;
  }): Promise<RestCreateCheckResponse> {
    let filePath = `${path}`.normalize('NFC');

    const result = await this.client.createCheck({
      Inputs: [{Type: 'LEAF', Locator: {Path: filePath, Uuid: uuid}, VersionId: versionId}],
      FindAvailablePath: true,
    });

    if (autoRename && result.data.Results?.length && result.data.Results[0].Exists) {
      filePath = result.data.Results[0].NextPath || filePath;
    }

    const metadata = {
      'Draft-Mode': 'true',
      'Create-Resource-Uuid': uuid,
      'Create-Version-Id': versionId,
    };

    await this.storageService.putObject({path: filePath, file, metadata});

    return result.data;
  }

  async promoteFileDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestPromoteVersionResponse> {
    const result = await this.client.promoteVersion(uuid, versionId, {Publish: true});

    return result.data;
  }

  async deleteFileDraft({uuid, versionId}: {uuid: string; versionId: string}): Promise<RestDeleteVersionResponse> {
    const result = await this.client.deleteVersion(uuid, versionId);

    return result.data;
  }

  async deleteFile({path}: {path: string}): Promise<RestPerformActionResponse> {
    const result = await this.client.performAction('delete', {Nodes: [{Path: path}]});

    return result.data;
  }

  async lookupFileByPath({path}: {path: string}): Promise<RestNode | undefined> {
    const result = await this.client.lookup({Locators: {Many: [{Path: path}]}});

    const node = result.data.Nodes?.[0];

    if (!node) {
      throw new Error(`File not found: ${path}`);
    }

    return node;
  }

  async lookupFileByUuid({uuid}: {uuid: string}): Promise<RestNode | undefined> {
    const result = await this.client.lookup({Locators: {Many: [{Uuid: uuid}]}});

    const node = result.data.Nodes?.[0];

    if (!node) {
      throw new Error(`File not found: ${uuid}`);
    }

    return node;
  }

  async getFileVersions({uuid}: {uuid: string}): Promise<RestVersion[] | undefined> {
    const result = await this.client.nodeVersions(uuid, {FilterBy: 'VersionsAll'});

    return result.data.Versions;
  }

  async getFile({id}: {id: string}): Promise<RestNode> {
    const result = await this.client.getByUuid(id);

    return result.data;
  }

  async getAllFiles({path}: {path: string}): Promise<RestNodeCollection> {
    const result = await this.client.lookup({
      Locators: {Many: [{Path: `${path}/*`}]},
      Flags: ['WithVersionsAll'],
    });

    return result.data;
  }

  async deleteFilePublicLink({uuid}: {uuid: string}): Promise<RestPublicLinkDeleteSuccess> {
    const result = await this.client.deletePublicLink(uuid);

    return result.data;
  }

  async getFilePublicLink({
    uuid,
    label,
    alreadyShared,
  }: {
    uuid: string;
    label: string;
    alreadyShared: boolean;
  }): Promise<RestShareLink> {
    if (alreadyShared) {
      await this.deleteFilePublicLink({uuid});
    }

    const result = await this.client.createPublicLink(uuid, {
      Link: {
        Label: label,
        Permissions: ['Preview', 'Download'],
      },
    });

    return result.data;
  }
}
