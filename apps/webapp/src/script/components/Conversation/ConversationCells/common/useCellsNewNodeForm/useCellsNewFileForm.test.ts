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
import {t} from 'Util/localizerUtil';

import {useCellsNewFileForm} from './useCellsNewFileForm';
import type {CellsFileType} from './useCellsNewFileForm';

describe('useCellsNewFileForm', () => {
  let mockCellsRepository: jest.Mocked<CellsRepository>;
  let onSuccess: jest.Mock;

  const createEvent = () => ({preventDefault: jest.fn()}) as unknown as FormEvent<HTMLFormElement>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCellsRepository = {
      checkFileAlreadyExists: jest.fn().mockResolvedValue(false),
      createFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onSuccess = jest.fn();
  });

  const renderUseCellsNewFileForm = (fileType: CellsFileType = 'document') =>
    renderHook(() =>
      useCellsNewFileForm({
        fileType,
        cellsRepository: mockCellsRepository,
        conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
        onSuccess,
        currentPath: '/wire-cells-web/path',
        isOpen: true,
      }),
    );

  it('adds extension and template UUID for document files', async () => {
    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New file'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.checkFileAlreadyExists).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New file.docx',
      }),
    );
    expect(mockCellsRepository.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New file.docx',
        templateUuid: '01-Microsoft Word.docx',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('uses matching extension and template UUID for spreadsheet files', async () => {
    const {result} = renderUseCellsNewFileForm('spreadsheet');

    act(() => {
      result.current.handleChange({currentTarget: {value: 'Budget'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Budget.xlsx',
        templateUuid: '02-Microsoft Excel.xlsx',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows already-exists error when precheck reports a duplicate', async () => {
    mockCellsRepository.checkFileAlreadyExists.mockResolvedValueOnce(true);
    const {result} = renderUseCellsNewFileForm();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New file'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.alreadyExistsError'));
    expect(mockCellsRepository.createFile).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
