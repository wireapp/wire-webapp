/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {createFactory} from '@enormora/objectory';

import type {QualifiedId} from '../../apiClient/user/qualifiedId';
import type {LogDirectory} from '../createOriginPrivateFileSystemLogStore';

export const qualifiedAccountIdentityFactory = createFactory<Readonly<QualifiedId>>(() => {
  return {domain: 'example.com', id: 'account'};
});

export const logDirectoryEntryFactory = createFactory<Pick<FileSystemHandle, 'name' | 'kind'>>(() => {
  return {name: 'unrelated.txt', kind: 'file'};
});

export const logDirectoryFactory = createFactory<LogDirectory>(() => {
  return {
    async getDirectoryHandle(): Promise<never> {
      throw new Error('Unexpected directory access');
    },
    async getFileHandle(): Promise<never> {
      throw new Error('Deletion must not open files');
    },
    async *values() {
      yield* [];
    },
    async removeEntry(): Promise<never> {
      throw new Error('Unexpected entry removal');
    },
  };
});
