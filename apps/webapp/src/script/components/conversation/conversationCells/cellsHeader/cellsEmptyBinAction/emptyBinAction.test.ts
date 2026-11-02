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

import type {CellsRepository} from 'Repositories/cells/cellsRepository';

import {emptyBin, isEmptyBinRootPath} from './emptyBinAction';

describe('isEmptyBinRootPath', () => {
  it('matches only the Shared Drive Bin root path', () => {
    expect(isEmptyBinRootPath('recycle_bin')).toBe(true);
    expect(isEmptyBinRootPath('recycle_bin/folder')).toBe(false);
    expect(isEmptyBinRootPath('files')).toBe(false);
  });
});

describe('emptyBin', () => {
  const conversationQualifiedId = {id: 'shared-drive', domain: 'wire.com'};

  it('permanently deletes the current Bin folder without listing its children', async () => {
    const response = {Status: 'Performed' as const};
    const cellsRepository = {
      lookupNodeByPath: jest.fn().mockResolvedValue({
        Path: 'shared-drive@wire.com/recycle_bin',
        Type: 'COLLECTION',
        Uuid: 'bin-folder-uuid',
      }),
      deleteNodes: jest.fn().mockResolvedValue(response),
      getAllNodes: jest.fn(),
      searchNodes: jest.fn(),
    } as unknown as CellsRepository;

    await expect(emptyBin({cellsRepository, conversationQualifiedId})).resolves.toBe(response);

    expect(cellsRepository.lookupNodeByPath).toHaveBeenCalledTimes(1);
    expect(cellsRepository.lookupNodeByPath).toHaveBeenLastCalledWith({
      path: 'shared-drive@wire.com/recycle_bin',
    });
    expect(cellsRepository.deleteNodes).toHaveBeenCalledTimes(1);
    expect(cellsRepository.deleteNodes).toHaveBeenLastCalledWith({
      uuids: ['bin-folder-uuid'],
      permanently: true,
    });
    expect(cellsRepository.getAllNodes).not.toHaveBeenCalled();
    expect(cellsRepository.searchNodes).not.toHaveBeenCalled();
  });

  it('does not delete when the current Bin folder cannot be resolved', async () => {
    const cellsRepository = {
      lookupNodeByPath: jest.fn().mockRejectedValue(new Error('Bin is unavailable')),
      deleteNodes: jest.fn(),
    } as unknown as CellsRepository;

    await expect(emptyBin({cellsRepository, conversationQualifiedId})).rejects.toThrow('Bin is unavailable');

    expect(cellsRepository.deleteNodes).not.toHaveBeenCalled();
  });
});
