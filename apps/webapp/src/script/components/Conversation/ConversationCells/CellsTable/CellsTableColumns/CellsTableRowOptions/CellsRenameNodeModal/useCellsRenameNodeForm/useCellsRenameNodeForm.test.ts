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

import {ChangeEvent, FormEvent} from 'react';
import {act, renderHook} from '@testing-library/react';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';

import {useCellsRenameForm} from './useCellsRenameNodeForm';

jest.mock('Util/localizerUtil', () => ({
  t: (key: string) => key,
}));

describe('useCellsRenameForm', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;
  let onSuccess: jest.Mock;

  const createNode = (overrides: Partial<CellNode> = {}): CellNode => ({
    id: 'node-id',
    name: 'Folder',
    path: '/Folder',
    sizeMb: '0',
    extension: '',
    uploadedAtTimestamp: 0,
    owner: 'owner-id',
    conversationName: 'Conversation',
    tags: [],
    presignedUrlExpiresAt: null,
    user: null,
    type: CellNodeType.FOLDER,
    ...overrides,
  });

  const createEvent = () => ({preventDefault: jest.fn()}) as unknown as FormEvent<HTMLFormElement>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCellsRepository = {
      renameNode: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onSuccess = jest.fn();
  });

  it('trims the base name and avoids trailing dots for folders', async () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'New Folder '}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(mockCellsRepository.renameNode).toHaveBeenCalledWith({
      currentPath: '/Folder',
      newName: 'New Folder',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('keeps the original extension when renaming files', async () => {
    const node = createNode({name: 'Report.txt', path: '/Report.txt', type: CellNodeType.FILE, extension: 'txt'});
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'Final Report '}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(mockCellsRepository.renameNode).toHaveBeenCalledWith({
      currentPath: '/Report.txt',
      newName: 'Final Report.txt',
    });
  });

  it('disables saving when the trimmed name matches the original', () => {
    const node = createNode({name: 'Folder'});
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'Folder '}} as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.isDisabled).toBe(true);
  });

  it('shows error when name contains invalid character "/"', async () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'New/Folder'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(result.current.error).toBe('cells.renameNodeModal.invalidCharacters');
    expect(mockCellsRepository.renameNode).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows error when name contains invalid character "."', async () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'New.Folder'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(result.current.error).toBe('cells.renameNodeModal.invalidCharacters');
    expect(mockCellsRepository.renameNode).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not call rename when name is empty after trimming', async () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: '   '}} as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.isDisabled).toBe(true);

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(mockCellsRepository.renameNode).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows error when renameNode fails', async () => {
    mockCellsRepository.renameNode.mockRejectedValueOnce(new Error('Network error'));
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'New Folder'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(result.current.error).toBe('cells.renameNodeModal.error');
    expect(mockCellsRepository.renameNode).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('clears name and error when handleClearName is called', () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: 'New Folder'}} as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.name).toBe('New Folder');

    act(() => {
      result.current.handleClearName();
    });

    expect(result.current.name).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('does not attempt rename when form is disabled', async () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    await act(async () => {
      await result.current.handleRename(createEvent());
    });

    expect(mockCellsRepository.renameNode).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('disables form when name is empty', () => {
    const node = createNode();
    const {result} = renderHook(() => useCellsRenameForm({node, cellsRepository: mockCellsRepository, onSuccess}));

    act(() => {
      result.current.handleNameChange({currentTarget: {value: ''}} as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.isDisabled).toBe(true);
  });
});
