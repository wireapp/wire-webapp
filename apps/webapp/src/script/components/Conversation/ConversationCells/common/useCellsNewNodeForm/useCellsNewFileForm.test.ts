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

  beforeEach(() => {
    jest.clearAllMocks();
    mockCellsRepository = {
      createFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsRepository>;
    onSuccess = jest.fn();
  });

  const setup = () => {
    const {result} = renderHook(() =>
      useCellsNewFileForm({
        fileType: 'document',
        cellsRepository: mockCellsRepository,
        conversationQualifiedId: {id: 'conversation-id', domain: 'wire.com'},
        onSuccess,
        currentPath: '/wire-cells-web/path',
      }),
    );

    return {
      result,
      createNodeMock: mockCellsRepository.createFile,
      onSuccess,
    };
  };

  it('appends selected file type extension when a mismatched extension is provided', async () => {
    const {result} = setup();
    const createEvent = () => ({preventDefault: jest.fn()}) as unknown as FormEvent<HTMLFormElement>;

    act(() => {
      result.current.handleChange({currentTarget: {value: 'doc124.ppt'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(mockCellsRepository.createFile).toHaveBeenCalledWith(expect.objectContaining({name: 'doc124.ppt.docx'}));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

});
