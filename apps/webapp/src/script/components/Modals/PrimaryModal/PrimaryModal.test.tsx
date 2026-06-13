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
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {PrimaryModalComponent} from './PrimaryModal';
import {PrimaryModalType} from './PrimaryModalTypes';

import {PrimaryModal, removeCurrentModal} from '.';
import {translateForTest} from 'Util/test/translateForTest';

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

describe('PrimaryModal', () => {
  beforeEach(() => {
    removeCurrentModal();
  });

  describe('Confirm', () => {
    it('does not render when no item is in the queue', async () => {
      const {getByTestId} = render(<PrimaryModalComponent />, {wrapper: rootProviderWrapper});
      const primaryModalWrapper = getByTestId('primary-modals-container');
      expect(primaryModalWrapper.children).toHaveLength(0);
    });

    it('correctly calls action callback', async () => {
      const actionCallback = jest.fn();
      const {getPrimaryActionButton} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: actionCallback,
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.CONFIRM,
      });

      fireEvent.click(getPrimaryActionButton());

      expect(actionCallback).toHaveBeenCalledTimes(1);
    });

    it('correctly calls secondary action callback', async () => {
      const secondaryActionCallback = jest.fn();

      const {getSecondaryActionButton} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: jest.fn(),
        secondaryAction: secondaryActionCallback,
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.CONFIRM,
      });

      fireEvent.click(getSecondaryActionButton());

      expect(secondaryActionCallback).toHaveBeenCalledTimes(1);
    });

    it('shows close button by default', async () => {
      const {getCloseButton} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: jest.fn(),
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.CONFIRM,
      });

      expect(getCloseButton()).toBeTruthy();
    });

    it('hides close button when hideCloseBtn is true', async () => {
      const {getCloseButton} = renderPrimaryModal({
        hideCloseButton: true,
        primaryAction: jest.fn(),
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.CONFIRM,
      });

      expect(getCloseButton()).toBeFalsy();
    });

    it('uses the provided translate function for default secondary action copy', async () => {
      const translate = (translationKey: string) => `translated:${translationKey}`;
      const {getSecondaryActionButton} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: jest.fn(),
        secondaryAction: jest.fn(),
        secondaryActionText: null,
        translate,
        type: PrimaryModalType.CONFIRM,
      });

      expect(getSecondaryActionButton()).toHaveTextContent('translated:modalConfirmSecondary');
    });
  });

  describe('Input', () => {
    it('should disable the primary button while the input is empty', async () => {
      const {getPrimaryActionButton, getInput} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: jest.fn(),
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.INPUT,
      });
      expect(getPrimaryActionButton()).toHaveProperty('disabled', true);

      fireEvent.change(getInput(), {target: {value: 'Test'}});
      expect(getPrimaryActionButton()).toHaveProperty('disabled', false);
    });
  });

  describe('GuestLinkPassword', () => {
    const action = jest.fn().mockImplementation();

    it('should show the active primary button', async () => {
      const {getPrimaryActionButton} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: action,
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.GUEST_LINK_PASSWORD,
      });

      expect(getPrimaryActionButton()).toHaveProperty('disabled', false);
    });

    it('should fire validation on submit click', async () => {
      const {getErrorMessage, getPrimaryActionButton} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: action,
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.GUEST_LINK_PASSWORD,
      });

      fireEvent.click(getPrimaryActionButton());

      expect(getErrorMessage()).toBeTruthy();
    });

    it('should fill password fields when generate password button clicked', async () => {
      const {getGeneratePasswordButton, getConfirmPasswordInput, getPasswordInput} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: action,
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.GUEST_LINK_PASSWORD,
      });

      fireEvent.click(getGeneratePasswordButton());

      const password = (getPasswordInput() as HTMLInputElement).value;

      expect(password).not.toBe('');
      expect(getConfirmPasswordInput()).toHaveProperty('value', password);
    });

    it('should call the action when form submitted successfully', async () => {
      const {getGeneratePasswordButton, getPrimaryActionButton, getPasswordInput} = renderPrimaryModal({
        hideCloseButton: false,
        primaryAction: action,
        secondaryAction: jest.fn(),
        secondaryActionText: 'secondary-text',
        translate: translateForTest,
        type: PrimaryModalType.GUEST_LINK_PASSWORD,
      });

      const generatePasswordButton = getGeneratePasswordButton();

      fireEvent.click(generatePasswordButton);
      const password = (getPasswordInput() as HTMLInputElement).value;

      act(() => {
        fireEvent.click(getPrimaryActionButton());
      });

      expect(action).toHaveBeenCalledWith(password, false);
    });
  });

  describe('SessionReset', () => {
    it('uses the provided translate function for generated modal content', async () => {
      const translate = (translationKey: string) => `translated:${translationKey}`;
      const {getByText} = render(withTheme(<PrimaryModalComponent />), {
        wrapper: rootProviderWrapper,
      });

      act(() => {
        PrimaryModal.show(PrimaryModalType.SESSION_RESET, {}, undefined, translate);
      });

      expect(getByText('translated:modalSessionResetHeadline')).toBeTruthy();
      expect(getByText('translated:modalAcknowledgeAction')).toBeTruthy();
    });
  });
});

type RenderPrimaryModalParameters = {
  hideCloseButton: boolean;
  primaryAction: () => void;
  secondaryAction: () => void;
  secondaryActionText: string | null;
  translate: (translationKey: string) => string;
  type: PrimaryModalType;
};

const renderPrimaryModal = ({
  hideCloseButton,
  primaryAction,
  secondaryAction,
  secondaryActionText,
  translate,
  type,
}: RenderPrimaryModalParameters) => {
  const {getByTestId, queryByTestId, getByLabelText} = render(withTheme(<PrimaryModalComponent />), {
    wrapper: rootProviderWrapper,
  });
  act(() => {
    PrimaryModal.show(
      type,
      {
        primaryAction: {
          action: primaryAction,
          text: 'test-text2',
        },
        secondaryAction:
          secondaryActionText === null
            ? {
                action: secondaryAction,
              }
            : {
                action: secondaryAction,
                text: secondaryActionText,
              },
        text: {
          message: 'test-message',
          title: 'test-title',
          input: 'test-input',
        },
        hideCloseBtn: hideCloseButton,
        copyPassword: true,
        closeOnConfirm: true,
        preventClose: false,
      },
      undefined,
      translate,
    );
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
