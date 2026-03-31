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

import {useCellsNewFileForm} from './useCellsNewFileForm';

jest.mock('Util/localizerUtil', () => ({
  t: (key: string) => key,
}));

describe('useCellsNewFileForm', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;
  let onSuccess: jest.Mock;

  const createEvent = () => ({preventDefault: jest.fn()}) as unknown as FormEvent<HTMLFormElement>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCellsRepository = {
      createFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onSuccess = jest.fn();
  });

  const renderUseCellsNewFileForm = () =>
    renderHook(() =>
      useCellsNewFileForm({
        fileType: 'document',
        cellsRepository: mockCellsRepository,
        conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
        onSuccess,
        currentPath: '/wire-cells-web/path',
      }),
    );

  it('shows an error when name is empty', async () => {
    const {result} = renderUseCellsNewFileForm();

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.nameRequired');
    expect(mockCellsRepository.createFile).not.toHaveBeenCalled();
  });

  it('does not submit when name validation fails', async () => {
    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'file/name'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.invalidCharactersError');
    expect(mockCellsRepository.createFile).not.toHaveBeenCalled();
  });

  it('maps 409 responses to already-exists error', async () => {
    mockCellsRepository.createFile.mockRejectedValueOnce({
      response: {status: 409},
    });

    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New file'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.alreadyExistsError');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('maps non-409 failures to generic error', async () => {
    mockCellsRepository.createFile.mockRejectedValueOnce(new Error('network error'));

    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New file'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe('cells.newItemMenuModalForm.genericError');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('trims the name and appends extension before create call', async () => {
    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: ' New file '}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New file.docx',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('appends selected file type extension when a mismatched extension is provided', async () => {
    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'doc124.ppt'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'doc124.ppt.docx',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
