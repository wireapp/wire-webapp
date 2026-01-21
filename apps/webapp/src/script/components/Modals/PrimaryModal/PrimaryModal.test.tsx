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

import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {PrimaryModalComponent} from './PrimaryModal';
import {PrimaryModalType} from './PrimaryModalTypes';

import {PrimaryModal, removeCurrentModal} from '.';

describe('PrimaryModal', () => {
  beforeEach(() => {
    removeCurrentModal();
  });

  describe('Confirm', () => {
    it('does not render when no item is in the queue', async () => {
      const {getByTestId} = render(<PrimaryModalComponent />);
      const primaryModalWrapper = getByTestId('primary-modals-container');
      expect(primaryModalWrapper.children).toHaveLength(0);
    });

    it('correctly calls action callback', async () => {
      const actionCallback = jest.fn();
      const {getPrimaryActionButton} = renderPrimaryModal(PrimaryModalType.CONFIRM, actionCallback);

      fireEvent.click(getPrimaryActionButton());

      expect(actionCallback).toHaveBeenCalledTimes(1);
    });

    it('correctly calls secondary action callback', async () => {
      const secondaryActionCallback = jest.fn();

      const {getSecondaryActionButton} = renderPrimaryModal(
        PrimaryModalType.CONFIRM,
        jest.fn(),
        secondaryActionCallback,
      );

      fireEvent.click(getSecondaryActionButton());

      expect(secondaryActionCallback).toHaveBeenCalledTimes(1);
    });

    it('shows close button by default', async () => {
      const {getCloseButton} = renderPrimaryModal(PrimaryModalType.CONFIRM);

      expect(getCloseButton()).toBeTruthy();
    });

    it('hides close button when hideCloseBtn is true', async () => {
      const {getCloseButton} = renderPrimaryModal(PrimaryModalType.CONFIRM, jest.fn(), jest.fn(), true);

      expect(getCloseButton()).toBeFalsy();
    });
  });

  describe('Input', () => {
    it('should disable the primary button while the input is empty', async () => {
      const {getPrimaryActionButton, getInput} = renderPrimaryModal(PrimaryModalType.INPUT);
      expect(getPrimaryActionButton()).toHaveProperty('disabled', true);

      fireEvent.change(getInput(), {target: {value: 'Test'}});
      expect(getPrimaryActionButton()).toHaveProperty('disabled', false);
    });
  });

  describe('GuestLinkPassword', () => {
    const action = jest.fn().mockImplementation();

    it('should show the active primary button', async () => {
      const {getPrimaryActionButton} = renderPrimaryModal(PrimaryModalType.GUEST_LINK_PASSWORD, action);

      expect(getPrimaryActionButton()).toHaveProperty('disabled', false);
    });

    it('should fire validation on submit click', async () => {
      const {getErrorMessage, getPrimaryActionButton} = renderPrimaryModal(
        PrimaryModalType.GUEST_LINK_PASSWORD,
        action,
      );

      fireEvent.click(getPrimaryActionButton());

      expect(getErrorMessage()).toBeTruthy();
    });

    it('should fill password fields when generate password button clicked', async () => {
      const {getGeneratePasswordButton, getConfirmPasswordInput, getPasswordInput} = renderPrimaryModal(
        PrimaryModalType.GUEST_LINK_PASSWORD,
        action,
      );

      fireEvent.click(getGeneratePasswordButton());

      const password = (getPasswordInput() as HTMLInputElement).value;

      expect(password).not.toBe('');
      expect(getConfirmPasswordInput()).toHaveProperty('value', password);
    });

    it('should call the action when form submitted successfully', async () => {
      const {getGeneratePasswordButton, getPrimaryActionButton, getPasswordInput} = renderPrimaryModal(
        PrimaryModalType.GUEST_LINK_PASSWORD,
        action,
      );

      const generatePasswordButton = getGeneratePasswordButton();

      fireEvent.click(generatePasswordButton);
      const password = (getPasswordInput() as HTMLInputElement).value;

      act(() => {
        fireEvent.click(getPrimaryActionButton());
      });

      expect(action).toHaveBeenCalledWith(password, false);
    });
  });
});

const renderPrimaryModal = (
  type: PrimaryModalType = PrimaryModalType.CONFIRM,
  primaryAction = () => {},
  secondaryAction = () => {},
  hideCloseBtn = false,
) => {
  const {getByTestId, queryByTestId, getByLabelText} = render(withTheme(<PrimaryModalComponent />));
  act(() => {
    PrimaryModal.show(type, {
      primaryAction: {
        action: primaryAction,
        text: 'test-text2',
      },
      secondaryAction: {
        action: secondaryAction,
        text: 'secondary-text',
      },
      text: {
        message: 'test-message',
        title: 'test-title',
        input: 'test-input',
      },
      hideCloseBtn,
      copyPassword: true,
      closeOnConfirm: true,
      preventClose: false,
    });
  });

  return {
    getPrimaryActionButton: () => getByTestId('do-action'),
    getSecondaryActionButton: () => getByTestId('do-secondary'),
    getCloseButton: () => queryByTestId('do-close'),
    getErrorMessage: () => getByTestId('primary-modals-error-message'),
    getPasswordInput: () => getByTestId('guest-link-password'),
    getInput: () => getByLabelText('test-input'),
    getGeneratePasswordButton: () => getByTestId('do-generate-password'),
    getConfirmPasswordInput: () => getByTestId('guest-link-password-confirm'),
  };
};
