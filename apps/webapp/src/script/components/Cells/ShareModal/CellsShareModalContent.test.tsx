/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {ReactNode} from 'react';

import {render, fireEvent} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {CellsShareModalContent} from './CellsShareModalContent';

// Mock dependencies
jest.mock('Util/LocalizerUtil', () => ({
  t: (key: string) => key,
}));

jest.mock('src/script/Config', () => ({
  Config: {
    getConfig: () => ({
      MINIMUM_PASSWORD_LENGTH: 8,
      NEW_PASSWORD_MINIMUM_LENGTH: 8,
    }),
  },
}));

const withTheme = (component: ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

// Mock child components that have complex dependencies
jest.mock('Components/Cells/ShareModal/CellsShareExpirationFields', () => ({
  CellsShareExpirationFields: () => <div data-uie-name="expiration-fields">Expiration Fields Mock</div>,
}));

jest.mock('Components/Conversation/ConversationCells/common/CellsTableLoader/CellsTableLoader', () => ({
  CellsTableLoader: () => <div data-uie-name="cells-table-loader">Loading...</div>,
}));

jest.mock('Components/CopyToClipboardButton/CopyToClipboardButton', () => ({
  CopyToClipboardButton: ({textToCopy, displayText}: {textToCopy: string; displayText: string}) => (
    <button data-uie-name="copy-to-clipboard-button">{displayText}</button>
  ),
}));

jest.mock('Components/PasswordGeneratorButton', () => ({
  PasswordGeneratorButton: ({onGeneratePassword}: {onGeneratePassword: (password: string) => void}) => (
    <button data-uie-name="do-generate-password" onClick={() => onGeneratePassword('generated-password')}>
      Generate Password
    </button>
  ),
}));

const defaultStyles = {
  wrapperStyles: {},
  labelStyles: {},
  publicLinkDescriptionStyles: {},
  passwordDescriptionStyles: {},
  expirationDescriptionStyles: {},
  dividerStyles: {},
  switchContentStyles: {},
  toggleContentStyles: {},
  switchContainerStyles: {},
  switchWrapperStyles: {},
  inputStyles: {},
  inputWrapperStyles: {},
  passwordContentStyles: {},
  passwordInputRowStyles: {},
  passwordInputLabelStyles: {},
  passwordInputStyles: {},
  passwordActionButtonStyles: {},
  passwordCopyButtonStyles: {},
  loaderWrapperStyles: {},
};

const defaultPublicLink = {
  status: 'success' as const,
  link: 'https://example.com/link',
  isEnabled: true,
  onToggle: jest.fn(),
  disabled: false,
};

const defaultPassword = {
  isEnabled: true,
  onToggle: jest.fn(),
  value: '',
  onChange: jest.fn(),
  onGeneratePassword: jest.fn(),
  hasExistingPassword: false,
  isEditingPassword: false,
  onChangePasswordClick: jest.fn(),
};

const defaultExpiration = {
  isEnabled: false,
  onToggle: jest.fn(),
  dateTime: null,
  onChange: jest.fn(),
};

const defaultProps = {
  publicLinkDescription: 'Test public link description',
  publicLink: defaultPublicLink,
  password: defaultPassword,
  expiration: defaultExpiration,
  isInputDisabled: false,
  styles: defaultStyles,
};

describe('CellsShareModalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('password section', () => {
    it('should render Change Password button when hasExistingPassword and not editing', () => {
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: true,
          hasExistingPassword: true,
          isEditingPassword: false,
        },
      };

      const {getByTestId, queryByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      // Should show the view mode with change password button
      expect(getByTestId('cells-share-password-view-mode')).toBeTruthy();
      expect(getByTestId('do-change-password')).toBeTruthy();

      // Should NOT show the password input content
      expect(queryByTestId('cells-share-password-content')).toBeNull();
    });

    it('should render password input fields when editing existing password', () => {
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: true,
          hasExistingPassword: true,
          isEditingPassword: true,
        },
      };

      const {getByTestId, queryByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      // Should show password input content
      expect(getByTestId('cells-share-password-content')).toBeTruthy();
      expect(getByTestId('do-generate-password')).toBeTruthy();

      // Should NOT show the view mode
      expect(queryByTestId('cells-share-password-view-mode')).toBeNull();
    });

    it('should render password input fields when no existing password', () => {
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: true,
          hasExistingPassword: false,
          isEditingPassword: false,
        },
      };

      const {getByTestId, queryByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      // Should show password input content
      expect(getByTestId('cells-share-password-content')).toBeTruthy();
      expect(getByTestId('do-generate-password')).toBeTruthy();

      // Should NOT show the view mode
      expect(queryByTestId('cells-share-password-view-mode')).toBeNull();
    });

    it('should call onChangePasswordClick when Change Password button is clicked', () => {
      const onChangePasswordClick = jest.fn();
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: true,
          hasExistingPassword: true,
          isEditingPassword: false,
          onChangePasswordClick,
        },
      };

      const {getByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      const changePasswordButton = getByTestId('do-change-password');
      fireEvent.click(changePasswordButton);

      expect(onChangePasswordClick).toHaveBeenCalledTimes(1);
    });

    it('should not render password section when password is not enabled', () => {
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: false,
          hasExistingPassword: true,
        },
      };

      const {queryByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      // Should NOT show any password content
      expect(queryByTestId('cells-share-password-view-mode')).toBeNull();
      expect(queryByTestId('cells-share-password-content')).toBeNull();
    });

    it('should render change password icon within the button', () => {
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: true,
          hasExistingPassword: true,
          isEditingPassword: false,
        },
      };

      const {getByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      expect(getByTestId('change-password-icon')).toBeTruthy();
    });

    it('should call onGeneratePassword when password generator button is clicked', () => {
      const onGeneratePassword = jest.fn();
      const props = {
        ...defaultProps,
        password: {
          ...defaultPassword,
          isEnabled: true,
          hasExistingPassword: false,
          onGeneratePassword,
        },
      };

      const {getByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      const generateButton = getByTestId('do-generate-password');
      fireEvent.click(generateButton);

      expect(onGeneratePassword).toHaveBeenCalledTimes(1);
      expect(onGeneratePassword).toHaveBeenCalledWith('generated-password');
    });
  });

  describe('public link section', () => {
    it('should render public link when enabled and status is success', () => {
      const {getByDisplayValue} = render(withTheme(<CellsShareModalContent {...defaultProps} />));

      expect(getByDisplayValue('https://example.com/link')).toBeTruthy();
    });

    it('should show loading state when status is loading', () => {
      const props = {
        ...defaultProps,
        publicLink: {
          ...defaultPublicLink,
          status: 'loading' as const,
        },
      };

      const {getByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      expect(getByTestId('cells-table-loader')).toBeTruthy();
    });

    it('should show error message when status is error', () => {
      const props = {
        ...defaultProps,
        publicLink: {
          ...defaultPublicLink,
          status: 'error' as const,
        },
      };

      const {getByText} = render(withTheme(<CellsShareModalContent {...props} />));

      expect(getByText('cells.shareModal.error.loadingLink')).toBeTruthy();
    });
  });

  describe('expiration section', () => {
    it('should render expiration fields when enabled', () => {
      const props = {
        ...defaultProps,
        expiration: {
          ...defaultExpiration,
          isEnabled: true,
        },
      };

      const {getByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      expect(getByTestId('cells-share-expiration-content')).toBeTruthy();
      expect(getByTestId('expiration-fields')).toBeTruthy();
    });

    it('should not render expiration fields when disabled', () => {
      const props = {
        ...defaultProps,
        expiration: {
          ...defaultExpiration,
          isEnabled: false,
        },
      };

      const {queryByTestId} = render(withTheme(<CellsShareModalContent {...props} />));

      expect(queryByTestId('cells-share-expiration-content')).toBeNull();
    });
  });
});
