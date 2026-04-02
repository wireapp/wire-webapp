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
import {t} from 'Util/localizerUtil';

import {useCellsNewNodeFormBase} from './useCellsNewNodeFormBase';

type CreateNodeMock = jest.MockedFunction<(name: string) => Promise<void>>;

interface SetupOptions {
  createNode?: CreateNodeMock;
  normalizeNameForCreation?: (rawName: string) => string;
  isOpen?: boolean;
}

describe('useCellsNewNodeFormBase', () => {
  const createEvent = () => ({preventDefault: jest.fn()}) as unknown as FormEvent<HTMLFormElement>;
  const createNodeMock = () => jest.fn().mockResolvedValue(undefined) as CreateNodeMock;

  const setup = ({createNode = createNodeMock(), normalizeNameForCreation, isOpen = true}: SetupOptions = {}) => {

    const {result, rerender} = renderHook(
      ({modalIsOpen}: {modalIsOpen: boolean}) =>
        useCellsNewNodeFormBase({
          createNode,
          normalizeNameForCreation,
          isOpen: modalIsOpen,
        }),
      {initialProps: {modalIsOpen: isOpen}},
    );

    return {
      result,
      rerender,
      createNode,
    };
  };

  it('shows required-name error and blocks submit when name is empty', async () => {
    const {result, createNode} = setup();

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.nameRequired'));
    expect(createNode).not.toHaveBeenCalled();
  });

  it('shows invalid-characters error and blocks submit for invalid name', async () => {
    const {result, createNode} = setup();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'file/name'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.invalidCharactersError'));
    expect(createNode).not.toHaveBeenCalled();
  });

  it('trims input and applies normalizeNameForCreation before calling createNode', async () => {
    const normalizeNameForCreation = jest.fn((rawName: string) => `${rawName}.normalized`);
    const {result, createNode} = setup({normalizeNameForCreation});

    act(() => {
      result.current.handleChange({currentTarget: {value: ' New item '}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(normalizeNameForCreation).toHaveBeenCalledWith('New item');
    expect(createNode).toHaveBeenCalledWith('New item.normalized');
  });

  it('maps 409 failures to already-exists error', async () => {
    const {result} = setup({createNode: jest.fn().mockRejectedValueOnce({response: {status: 409}})});

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New item'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.alreadyExistsError'));
  });

  it('maps non-409 failures to generic error', async () => {
    const {result} = setup({createNode: jest.fn().mockRejectedValueOnce(new Error('network error'))});

    act(() => {
      result.current.handleChange({currentTarget: {value: 'New item'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.genericError'));
  });

  it('clears name and error when handleClear is called', async () => {
    const {result} = setup();

    act(() => {
      result.current.handleChange({currentTarget: {value: 'invalid/name'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.name).toBe('invalid/name');
    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.invalidCharactersError'));

    act(() => {
      result.current.handleClear();
    });

    expect(result.current.name).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('resets state when modal is reopened', async () => {
    const {result, rerender} = setup({isOpen: true});

    act(() => {
      result.current.handleChange({currentTarget: {value: 'invalid/name'}} as ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit(createEvent());
    });

    expect(result.current.name).toBe('invalid/name');
    expect(result.current.error).toBe(t('cells.newItemMenuModalForm.invalidCharactersError'));

    act(() => {
      rerender({modalIsOpen: false});
    });

    act(() => {
      rerender({modalIsOpen: true});
    });

    expect(result.current.name).toBe('');
    expect(result.current.error).toBeNull();
  });
});
