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

import {useEffect, useState} from 'react';

import {RestNode} from 'cells-sdk-ts';

import {CellsRepository} from 'src/script/cells/CellsRepository';

interface UseGetCellsFilesProps {
  cellsRepository: CellsRepository;
}

interface File {
  id: string;
}

export const useGetCellsFiles = ({cellsRepository}: UseGetCellsFilesProps) => {
  const [files, setFiles] = useState<RestNode[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const result = await cellsRepository.getAllFiles();

      console.log('getAllFiles', result);

      if (!result.Nodes) {
        throw new Error('No files found');
      }

      setFiles(result.Nodes);
    };
    void fetch();
  }, []);

  return {files};
};

// [
//   {
//     Uuid: '6821f3d7-e5b1-4573-b9ea-857a4a5422a4',
//     Path: 'wire-cells-web/document.pdf',
//     Type: 'LEAF',
//     Size: '167793',
//     Modified: '1741248956',
//     ContentType: 'application/pdf',
//     ContentHash: '5c73583d02416540017e13586afa2ee8',
//     HashingMethod: 'v4',
//     StorageETag: '4c1aca8970da585c8f2491bccaeb6455',
//     DataSourceFeatures: {
//       Versioned: true,
//     },
//     Previews: [
//       {
//         ContentType: 'image/jpg',
//         Bucket: 'io',
//         Key: 'pydio-thumbstore/6821f3d7-e5b1-4573-b9ea-857a4a5422a4.jpg',
//       },
//     ],
//     UserMetadata: [
//       {
//         Namespace: 'usermeta-owner',
//         JsonValue: '"web"',
//       },
//     ],
//     Versions: [
//       {
//         VersionId: '8b4044d6-a775-4d43-818a-adc0ea30c76c',
//         Description: 'Created by [web](user://web)',
//         MTime: '1741248956',
//         Size: '167793',
//         ETag: '4c1aca8970da585c8f2491bccaeb6455',
//         ContentHash: '5c73583d02416540017e13586afa2ee8',
//         OwnerName: 'web',
//         OwnerUuid: 'd5454f12-1bb3-47f5-9560-a152b1b764c5',
//       },
//     ],
//   },
//   {
//     Uuid: 'f13f4a67-d2cd-4556-b2e6-525373b38bf3',
//     Path: 'wire-cells-web/file-sample_500kB.doc',
//     Type: 'LEAF',
//     Size: '503296',
//     Modified: '1741248960',
//     ContentType: 'application/msword',
//     ContentHash: '6c110ddf35098cfbb9d0a82f208eca70',
//     HashingMethod: 'v4',
//     StorageETag: 'f66e2b042497390f2feed4a95ff9d613',
//     DataSourceFeatures: {
//       Versioned: true,
//     },
//     Previews: [
//       {
//         ContentType: 'image/jpg',
//         Bucket: 'io',
//         Key: 'pydio-thumbstore/f13f4a67-d2cd-4556-b2e6-525373b38bf3.jpg',
//       },
//       {
//         ContentType: 'application/pdf',
//         Bucket: 'io',
//         Key: 'pydio-thumbstore/f13f4a67-d2cd-4556-b2e6-525373b38bf3.pdf',
//       },
//     ],
//     UserMetadata: [
//       {
//         Namespace: 'usermeta-owner',
//         JsonValue: '"web"',
//       },
//     ],
//     Versions: [
//       {
//         VersionId: 'f1651173-cd26-47c3-846e-d9a2a97aced8',
//         Description: 'Created by [web](user://web)',
//         MTime: '1741248960',
//         Size: '503296',
//         ETag: 'f66e2b042497390f2feed4a95ff9d613',
//         ContentHash: '6c110ddf35098cfbb9d0a82f208eca70',
//         OwnerName: 'web',
//         OwnerUuid: 'd5454f12-1bb3-47f5-9560-a152b1b764c5',
//       },
//     ],
//   },
//   {
//     Uuid: 'db143fbe-083c-4d47-acac-0933ce656e79',
//     Path: 'wire-cells-web/file_example_MP3.mp3',
//     Type: 'LEAF',
//     Size: '5319693',
//     Modified: '1741248958',
//     ContentType: 'audio/mpeg',
//     ContentHash: 'e95c4f309ff1e1c74d39c9a981ba48f6',
//     HashingMethod: 'v4',
//     StorageETag: '00ba46e6fd66e7eae9ec9c43d0828580',
//     DataSourceFeatures: {
//       Versioned: true,
//     },
//     UserMetadata: [
//       {
//         Namespace: 'usermeta-owner',
//         JsonValue: '"web"',
//       },
//     ],
//     Versions: [
//       {
//         VersionId: '6965fb1d-ddda-4494-ad54-75667ffee7c2',
//         Description: 'Created by [web](user://web)',
//         MTime: '1741248958',
//         Size: '5319693',
//         ETag: '00ba46e6fd66e7eae9ec9c43d0828580',
//         ContentHash: 'e95c4f309ff1e1c74d39c9a981ba48f6',
//         OwnerName: 'web',
//         OwnerUuid: 'd5454f12-1bb3-47f5-9560-a152b1b764c5',
//       },
//     ],
//   },
//   {
//     Uuid: '9ab44c46-b688-41ac-95e8-cfa2467e8425',
//     Path: 'wire-cells-web/recycle_bin',
//     Type: 'COLLECTION',
//     Size: '1863786',
//     Modified: '1737960687',
//     HashingMethod: 'v4',
//     StorageETag: 'a6e8da401170025a6fa5c2f54184e89d',
//     IsRecycleBin: true,
//     DataSourceFeatures: {
//       Versioned: true,
//     },
//     Metadata: [
//       {
//         Namespace: 'recycle_bin',
//         Value: '"true"',
//       },
//     ],
//   },
//   {
//     Uuid: '96925e63-4d58-4ff4-9107-ac59e97dce95',
//     Path: 'wire-cells-web/sample3.pdf',
//     Type: 'LEAF',
//     Size: '1253607',
//     Modified: '1741248961',
//     ContentType: 'application/pdf',
//     ContentHash: '455d29db5dd2fa18a05aa82e3d666c44',
//     HashingMethod: 'v4',
//     StorageETag: 'ca12ef7b9e7b41fdde61d1cd60a6c41c',
//     DataSourceFeatures: {
//       Versioned: true,
//     },
//     Previews: [
//       {
//         ContentType: 'image/jpg',
//         Bucket: 'io',
//         Key: 'pydio-thumbstore/96925e63-4d58-4ff4-9107-ac59e97dce95.jpg',
//       },
//     ],
//     UserMetadata: [
//       {
//         Namespace: 'usermeta-owner',
//         JsonValue: '"web"',
//       },
//     ],
//     Versions: [
//       {
//         VersionId: '1e7841eb-f6bc-433d-bd61-02e756ecf6ac',
//         Description: 'Created by [web](user://web)',
//         MTime: '1741248961',
//         Size: '1253607',
//         ETag: 'ca12ef7b9e7b41fdde61d1cd60a6c41c',
//         ContentHash: '455d29db5dd2fa18a05aa82e3d666c44',
//         OwnerName: 'web',
//         OwnerUuid: 'd5454f12-1bb3-47f5-9560-a152b1b764c5',
//       },
//     ],
//   },
// ];
