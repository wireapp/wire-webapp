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

import {act, render} from '@testing-library/react';

import {UndoneChangeNotifier} from './undoneChangeNotifier';

import {translateForTest} from '../../util/test/translateForTest';

const mockShow = jest.fn();

jest.mock('../../components/appNotification', () => {
  return {
    useAppNotification: () => {
      return {show: mockShow, close: jest.fn()};
    },
  };
});

describe('UndoneChangeNotifier', () => {
  function renderNotifier(): {
    notify: (change: 'edit' | 'delete') => void;
    stopListening: jest.Mock;
    unmount: () => void;
  } {
    let listener: ((change: 'edit' | 'delete') => void) | undefined;
    const stopListening = jest.fn();
    const messageRepository = {
      onChangeUndone: jest.fn(callback => {
        listener = callback;
        return stopListening;
      }),
    };
    const {unmount} = render(
      <UndoneChangeNotifier messageRepository={messageRepository} translate={translateForTest} />,
    );
    return {
      notify: change => {
        act(() => {
          listener?.(change);
        });
      },
      stopListening,
      unmount,
    };
  }

  beforeEach(() => {
    mockShow.mockClear();
  });

  it('shows the notice of an edit that was taken back', () => {
    renderNotifier().notify('edit');

    expect(mockShow).toHaveBeenCalledWith({message: 'outboxChangeUndoneEdit'});
  });

  it('shows the notice of a deletion that was taken back', () => {
    renderNotifier().notify('delete');

    expect(mockShow).toHaveBeenCalledWith({message: 'outboxChangeUndoneDelete'});
  });

  it('stops listening when it is removed', () => {
    const {unmount, stopListening} = renderNotifier();

    unmount();

    expect(stopListening).toHaveBeenCalledTimes(1);
  });
});
