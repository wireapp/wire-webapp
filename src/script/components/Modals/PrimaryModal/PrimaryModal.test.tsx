/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {render, fireEvent, act} from '@testing-library/react';

import {PrimaryModalComponent} from './PrimaryModal';

import {PrimaryModal, removeCurrentModal} from '.';

describe('PrimaryModal', () => {
  beforeEach(() => {
    removeCurrentModal();
  });
  it('does not render when no item is in the queue', async () => {
    const {getByTestId} = render(<PrimaryModalComponent />);
    const PrimaryModalWrapper = getByTestId('primary-modals-container');
    expect(PrimaryModalWrapper.children[0].getAttribute('style')).toBe('display: none;');
  });

  it('correctly calls action callback', async () => {
    const {getByTestId} = render(<PrimaryModalComponent />);
    const actionCallback = jest.fn();
    act(() => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: actionCallback,
          text: 'test-text',
        },
        secondaryAction: {
          action: () => {},
          text: 'secondary-text',
        },
        text: {
          message: 'test-message',
          title: 'test-title',
        },
      });
    });

    const actionButton = getByTestId('do-action');
    fireEvent.click(actionButton);

    expect(actionCallback).toHaveBeenCalledTimes(1);
  });
  it('correctly calls secondary action callback', async () => {
    const {getByTestId} = render(<PrimaryModalComponent />);
    const secondaryActionCallback = jest.fn();
    act(() => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: () => {},
          text: 'test-text',
        },
        secondaryAction: {
          action: secondaryActionCallback,
          text: 'secondary-text',
        },
        text: {
          message: 'test-message',
          title: 'test-title',
        },
      });
    });

    const secondaryActionButton = getByTestId('do-secondary');
    fireEvent.click(secondaryActionButton);

    expect(secondaryActionCallback).toHaveBeenCalledTimes(1);
  });

  it('shows close button by default', async () => {
    const {container} = render(<PrimaryModalComponent />);

    act(() => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: () => {},
          text: 'test-text',
        },
        secondaryAction: {
          action: () => {},
          text: 'secondary-text',
        },
        text: {
          message: 'test-message',
          title: 'test-title',
        },
      });
    });
    const closeButton = container.querySelector('button[data-uie-name="do-close"]');

    expect(closeButton).toBeTruthy();
  });

  it('hides close button when hideCloseBtn is true', async () => {
    const {container} = render(<PrimaryModalComponent />);
    act(() => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: () => {},
          text: 'test-text2',
        },
        secondaryAction: {
          action: () => {},
          text: 'secondary-text',
        },
        text: {
          message: 'test-message',
          title: 'test-title',
        },
        hideCloseBtn: true,
      });
    });
    const closeButton = container.querySelector('button[data-uie-name="do-close"]');
    expect(closeButton).toBeFalsy();
  });
});
