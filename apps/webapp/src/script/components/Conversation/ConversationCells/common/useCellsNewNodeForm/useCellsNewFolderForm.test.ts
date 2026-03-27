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

import {CellsRepository} from 'Repositories/cells/CellsRepository';

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
    } as unknown as jest.Mocked<CellsRepository>;
    onSuccess = jest.fn();
  });

  const renderUseCellsNewFolderForm = () =>
    renderHook(() =>
      useCellsNewFolderForm({
        cellsRepository: mockCellsRepository,
        conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
        onSuccess,
        currentPath: '/wire-cells-web/path',
      }),
    );

  it('shows an error when name is empty', async () => {
    const {result} = renderUseCellsNewFolderForm();

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.nameRequired');
    expect(mockCellsRepository.createFolder).not.toHaveBeenCalled();
  });

  it('maps 409 responses to already-exists error', async () => {
    mockCellsRepository.createFolder.mockRejectedValueOnce({
      response: {status: 409},
    });

    const {result} = renderUseCellsNewFolderForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New folder'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.alreadyExistsError');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('maps non-409 failures to generic error', async () => {
    mockCellsRepository.createFolder.mockRejectedValueOnce(new Error('network error'));

    const {result} = renderUseCellsNewFolderForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New folder'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.genericError');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('trims the name before create call', async () => {
    const {result} = renderUseCellsNewFolderForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: ' New folder '}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New folder',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

});
