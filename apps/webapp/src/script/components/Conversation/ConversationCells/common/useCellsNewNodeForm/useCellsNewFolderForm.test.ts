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

import {useCellsNewFolderForm} from './useCellsNewFolderForm';

jest.mock('Util/localizerUtil', () => ({
  t: (key: string) => key,
}));

describe('useCellsNewFolderForm', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;
  let onSuccess: jest.Mock;

  const createEvent = () => ({preventDefault: jest.fn()}) as unknown as FormEvent<HTMLFormElement>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCellsRepository = {
      createFolder: jest.fn().mockResolvedValue(undefined),
      createFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onSuccess = jest.fn();
  });

  const setup = () =>
    renderHook(() =>
      useCellsNewFolderForm({
        cellsRepository: mockCellsRepository,
        conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
        onSuccess,
        currentPath: '/wire-cells-web/path',
      }),
    );

  it('does not append file extension or template data when creating folder names', async () => {
    const {result} = setup();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'Project.docx'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Project.docx',
      }),
    );
    expect(mockCellsRepository.createFolder).toHaveBeenCalledTimes(1);
  });

  it('uses createFolder repository method and never calls createFile', async () => {
    const {result} = setup();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New folder'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFolder).toHaveBeenCalledTimes(1);
    expect(mockCellsRepository.createFile).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
