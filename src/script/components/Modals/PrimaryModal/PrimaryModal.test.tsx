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

import {act} from '@testing-library/react';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import TestPage from 'Util/test/TestPage';
import PrimaryModal, {PrimaryModalProps} from './PrimaryModal';
import {PrimaryModalType} from './PrimaryModalTypes';

class PrimaryModalPage extends TestPage<PrimaryModalProps> {
  constructor(props?: PrimaryModalProps) {
    super(PrimaryModal, props);
  }

  getWrapperElement = () => this.get('div#modals');
  getPrimaryActionButton = () => this.get('[data-uie-name="do-action"]');
  getSecondaryActionButton = () => this.get('[data-uie-name="do-secondary"]');
}

describe('PrimaryModal', () => {
  it('does not render when no item is in the queue', async () => {
    const PrimaryModal = new PrimaryModalPage({});
    expect(PrimaryModal.getWrapperElement()?.children[0].getAttribute('style')).toBe('display: none;');
  });

  it('correctly calls action callback', async () => {
    const PrimaryModal = new PrimaryModalPage({});
    const actionCallback = jest.fn();
    act(() => {
      amplify.publish(WebAppEvents.WARNING.MODAL, PrimaryModalType.CONFIRM, {
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
    const actionButton = PrimaryModal.getPrimaryActionButton();
    if (!actionButton) {
      throw new Error('Failed to find action button');
    }
    PrimaryModal.click(actionButton);

    expect(actionCallback).toHaveBeenCalledTimes(1);
  });
  it('correctly calls secondary action callback', async () => {
    const PrimaryModal = new PrimaryModalPage({});
    const secondaryActionCallback = jest.fn();
    act(() => {
      amplify.publish(WebAppEvents.WARNING.MODAL, PrimaryModalType.CONFIRM, {
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
    const secondaryActionButton = PrimaryModal.getSecondaryActionButton();
    if (!secondaryActionButton) {
      throw new Error('Failed to find action button');
    }
    PrimaryModal.click(secondaryActionButton);

    expect(secondaryActionCallback).toHaveBeenCalledTimes(1);
  });
});
