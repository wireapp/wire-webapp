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

import {ComponentProps} from 'react';
import {CSSObject} from '@emotion/react';
import {BASE_DARK_COLOR, BASE_LIGHT_COLOR, COLOR_V2, Input, Label, Switch} from '@wireapp/react-ui-kit';

import {CellsTableLoader} from 'Components/Conversation/ConversationCells/common/CellsTableLoader/CellsTableLoader';
import {CopyToClipboardButton} from 'Components/CopyToClipboardButton/CopyToClipboardButton';

type PublicLinkStatus = 'idle' | 'loading' | 'error' | 'success';

type SwitchColorProps = Pick<
  ComponentProps<typeof Switch>,
  | 'activatedColor'
  | 'activatedColorDark'
  | 'deactivatedColor'
  | 'deactivatedColorDark'
  | 'disabledColor'
  | 'disabledColorDark'
>;

interface CellsShareModalContentStyles {
  wrapperStyles: CSSObject;
  labelStyles: CSSObject;
  publicLinkDescriptionStyles: CSSObject;
  passwordDescriptionStyles: CSSObject;
  expirationDescriptionStyles: CSSObject;
  dividerStyles: CSSObject;
  switchContentStyles: CSSObject;
  toggleContentStyles: CSSObject;
  switchContainerStyles: CSSObject;
  switchWrapperStyles: CSSObject;
  inputStyles: CSSObject;
  inputWrapperStyles: CSSObject;
  loaderWrapperStyles: CSSObject;
}

interface CellsShareModalContentProps {
  publicLinkDescription: string;
  labels: {
    enablePublicLink: string;
    password: string;
    passwordDescription: string;
    expiration: string;
    expirationDescription: string;
    generatedPublicLink: string;
    copyLink: string;
    linkCopied: string;
    errorLoadingLink: string;
  };
  publicLink: {
    status: PublicLinkStatus;
    link?: string;
    isEnabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  };
  password: {
    isEnabled: boolean;
    onToggle: () => void;
  };
  expiration: {
    isEnabled: boolean;
    onToggle: () => void;
  };
  isInputDisabled: boolean;
  styles: CellsShareModalContentStyles;
  switchColors?: {
    publicLink?: SwitchColorProps;
    password?: SwitchColorProps;
    expiration?: SwitchColorProps;
  };
}

const DEFAULT_SWITCH_COLORS: SwitchColorProps = {
  activatedColor: BASE_LIGHT_COLOR.GREEN,
  activatedColorDark: BASE_DARK_COLOR.GREEN,
  deactivatedColor: COLOR_V2.GRAY_70,
  deactivatedColorDark: COLOR_V2.GRAY_60,
  disabledColor: COLOR_V2.GRAY_70,
  disabledColorDark: COLOR_V2.GRAY_60,
};

export const CellsShareModalContent = ({
  publicLinkDescription,
  labels,
  publicLink,
  password,
  expiration,
  isInputDisabled,
  styles,
  switchColors,
}: CellsShareModalContentProps) => {
  const shouldShowLink = publicLink.isEnabled && publicLink.status === 'success' && publicLink.link;
  const publicLinkColors = switchColors?.publicLink ?? DEFAULT_SWITCH_COLORS;
  const passwordColors = switchColors?.password ?? DEFAULT_SWITCH_COLORS;
  const expirationColors = switchColors?.expiration ?? DEFAULT_SWITCH_COLORS;

  return (
    <div css={styles.wrapperStyles}>
      <div css={styles.switchContainerStyles}>
        <div css={styles.switchContentStyles}>
          <Label htmlFor="switch-public-link" css={styles.labelStyles}>
            {labels.enablePublicLink}
          </Label>
          <p id="switch-public-link-description" css={styles.publicLinkDescriptionStyles}>
            {publicLinkDescription}
          </p>
        </div>
        <div css={styles.switchWrapperStyles}>
          <Switch
            id="switch-public-link"
            aria-describedby="switch-public-link-description"
            checked={publicLink.isEnabled}
            onToggle={publicLink.onToggle}
            disabled={publicLink.disabled}
            {...publicLinkColors}
          />
        </div>
      </div>
      <hr css={styles.dividerStyles} />
      <div css={styles.switchContainerStyles}>
        <div css={styles.switchContentStyles}>
          <Label htmlFor="switch-password" css={styles.labelStyles}>
            {labels.password}
          </Label>
          <p id="switch-password-description" css={styles.passwordDescriptionStyles}>
            {labels.passwordDescription}
          </p>
        </div>
        <div css={styles.switchWrapperStyles}>
          <Switch
            id="switch-password"
            aria-describedby="switch-password-description"
            checked={password.isEnabled}
            onToggle={password.onToggle}
            {...passwordColors}
          />
        </div>
      </div>
      {password.isEnabled && <div css={styles.toggleContentStyles} data-uie-name="cells-share-password-content" />}
      <div css={styles.switchContainerStyles}>
        <div css={styles.switchContentStyles}>
          <Label htmlFor="switch-expiration" css={styles.labelStyles}>
            {labels.expiration}
          </Label>
          <p id="switch-expiration-description" css={styles.expirationDescriptionStyles}>
            {labels.expirationDescription}
          </p>
        </div>
        <div css={styles.switchWrapperStyles}>
          <Switch
            id="switch-expiration"
            aria-describedby="switch-expiration-description"
            checked={expiration.isEnabled}
            onToggle={expiration.onToggle}
            {...expirationColors}
          />
        </div>
      </div>
      {expiration.isEnabled && <div css={styles.toggleContentStyles} data-uie-name="cells-share-expiration-content" />}
      {shouldShowLink && (
        <div css={styles.inputWrapperStyles}>
          <label htmlFor="generated-public-link" className="visually-hidden">
            {labels.generatedPublicLink}
          </label>
          <Input
            id="generated-public-link"
            value={publicLink.link}
            wrapperCSS={styles.inputStyles}
            disabled={isInputDisabled}
            readOnly
          />
          <CopyToClipboardButton
            textToCopy={publicLink.link || ''}
            displayText={labels.copyLink}
            copySuccessText={labels.linkCopied}
          />
        </div>
      )}
      {publicLink.status === 'loading' && (
        <div css={styles.loaderWrapperStyles}>
          <CellsTableLoader />
        </div>
      )}
      {publicLink.status === 'error' && <div>{labels.errorLoadingLink}</div>}
    </div>
  );
};
