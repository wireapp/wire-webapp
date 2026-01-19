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

import {ValidationUtil} from '@wireapp/commons';
import {BASE_DARK_COLOR, BASE_LIGHT_COLOR, COLOR_V2, Input, Label, Switch} from '@wireapp/react-ui-kit';

import {
  CellsShareExpirationFields,
  type CellsShareExpirationSelection,
} from 'Components/Cells/ShareModal/CellsShareExpirationFields';
import {CellsTableLoader} from 'Components/Conversation/ConversationCells/common/CellsTableLoader/CellsTableLoader';
import {CopyToClipboardButton} from 'Components/CopyToClipboardButton/CopyToClipboardButton';
import {PasswordGeneratorButton} from 'Components/PasswordGeneratorButton';
import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

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
  passwordContentStyles: CSSObject;
  passwordInputRowStyles: CSSObject;
  passwordInputLabelStyles: CSSObject;
  passwordInputStyles: CSSObject;
  passwordActionButtonStyles: CSSObject;
  passwordCopyButtonStyles: CSSObject;
  loaderWrapperStyles: CSSObject;
}

interface CellsShareModalContentLabels {
  enablePublicLink: string;
  password: string;
  passwordDescription: string;
  expiration: string;
  expirationDescription: string;
  expirationExpiresLabel: string;
  expirationDateAriaLabel: string;
  expirationTimeAriaLabel: string;
  expirationOpenCalendarLabel: string;
  expirationPreviousMonthLabel: string;
  expirationNextMonthLabel: string;
  expirationPastDateError: string;
  generatedPublicLink: string;
  copyLink: string;
  linkCopied: string;
  errorLoadingLink: string;
  passwordInputLabel: string;
  passwordInputPlaceholder: string;
  passwordCopy: string;
  passwordCopied: string;
  showTogglePasswordLabel: string;
  hideTogglePasswordLabel: string;
}

interface CellsShareModalContentProps {
  publicLinkDescription: string;
  labels?: Partial<CellsShareModalContentLabels>;
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
    value: string;
    onChange: (value: string) => void;
    onGeneratePassword: (password: string) => void;
  };
  expiration: {
    isEnabled: boolean;
    onToggle: () => void;
    onChange?: (nextValue: CellsShareExpirationSelection) => void;
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

const DEFAULT_LABELS: CellsShareModalContentLabels = {
  enablePublicLink: t('cells.shareModal.enablePublicLink'),
  password: t('cells.shareModal.password'),
  passwordDescription: t('cells.shareModal.password.description'),
  expiration: t('cells.shareModal.expiration'),
  expirationDescription: t('cells.shareModal.expiration.description'),
  expirationExpiresLabel: t('cells.shareModal.expiration.expiresLabel'),
  expirationDateAriaLabel: t('cells.shareModal.expiration.dateAriaLabel'),
  expirationTimeAriaLabel: t('cells.shareModal.expiration.timeAriaLabel'),
  expirationOpenCalendarLabel: t('cells.shareModal.expiration.openCalendarLabel'),
  expirationPreviousMonthLabel: t('cells.shareModal.expiration.previousMonthLabel'),
  expirationNextMonthLabel: t('cells.shareModal.expiration.nextMonthLabel'),
  expirationPastDateError: t('cells.shareModal.expiration.error.pastDate'),
  generatedPublicLink: t('cells.shareModal.generatedPublicLink'),
  copyLink: t('cells.shareModal.copyLink'),
  linkCopied: t('cells.shareModal.linkCopied'),
  errorLoadingLink: t('cells.shareModal.error.loadingLink'),
  passwordInputLabel: t('modalGuestLinkJoinLabel'),
  passwordInputPlaceholder: t('modalGuestLinkJoinPlaceholder'),
  passwordCopy: t('conversationContextMenuCopy'),
  passwordCopied: t('guestOptionsPasswordCopyToClipboardSuccess'),
  showTogglePasswordLabel: t('showTogglePasswordLabel'),
  hideTogglePasswordLabel: t('hideTogglePasswordLabel'),
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
  const resolvedLabels = {...DEFAULT_LABELS, ...labels};
  const shouldShowLink = publicLink.isEnabled && publicLink.status === 'success' && publicLink.link;
  const publicLinkColors = switchColors?.publicLink ?? DEFAULT_SWITCH_COLORS;
  const passwordColors = switchColors?.password ?? DEFAULT_SWITCH_COLORS;
  const expirationColors = switchColors?.expiration ?? DEFAULT_SWITCH_COLORS;

  return (
    <div css={styles.wrapperStyles}>
      <div css={styles.switchContainerStyles}>
        <div css={styles.switchContentStyles}>
          <Label htmlFor="switch-public-link" css={styles.labelStyles}>
            {resolvedLabels.enablePublicLink}
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
            {resolvedLabels.password}
          </Label>
          <p id="switch-password-description" css={styles.passwordDescriptionStyles}>
            {resolvedLabels.passwordDescription}
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
      {password.isEnabled && (
        <div css={styles.toggleContentStyles} data-uie-name="cells-share-password-content">
          <div css={styles.passwordContentStyles}>
            <div css={styles.passwordActionButtonStyles}>
              <PasswordGeneratorButton
                passwordLength={Config.getConfig().MINIMUM_PASSWORD_LENGTH}
                onGeneratePassword={password.onGeneratePassword}
              />
            </div>
            <div css={styles.passwordInputRowStyles}>
              <Label htmlFor="cells_share_pswd" css={styles.passwordInputLabelStyles}>
                {resolvedLabels.passwordInputLabel}
              </Label>
              <Input
                name="cells-share-password"
                data-uie-name="cells-share-password"
                placeholder={resolvedLabels.passwordInputPlaceholder}
                id="cells_share_pswd"
                type="password"
                showTogglePasswordLabel={resolvedLabels.showTogglePasswordLabel}
                hideTogglePasswordLabel={resolvedLabels.hideTogglePasswordLabel}
                autoComplete="off"
                value={password.value}
                onChange={event => password.onChange(event.currentTarget.value)}
                pattern={ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)}
                wrapperCSS={styles.passwordInputStyles}
              />
              <div css={styles.passwordCopyButtonStyles}>
                <CopyToClipboardButton
                  textToCopy={password.value}
                  displayText={resolvedLabels.passwordCopy}
                  copySuccessText={resolvedLabels.passwordCopied}
                  disabled={!password.value}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div css={styles.switchContainerStyles}>
        <div css={styles.switchContentStyles}>
          <Label htmlFor="switch-expiration" css={styles.labelStyles}>
            {resolvedLabels.expiration}
          </Label>
          <p id="switch-expiration-description" css={styles.expirationDescriptionStyles}>
            {resolvedLabels.expirationDescription}
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
      {expiration.isEnabled && (
        <div css={styles.toggleContentStyles} data-uie-name="cells-share-expiration-content">
          <CellsShareExpirationFields
            labels={{
              expiresLabel: resolvedLabels.expirationExpiresLabel,
              dateAriaLabel: resolvedLabels.expirationDateAriaLabel,
              timeAriaLabel: resolvedLabels.expirationTimeAriaLabel,
              openCalendarLabel: resolvedLabels.expirationOpenCalendarLabel,
              previousMonthLabel: resolvedLabels.expirationPreviousMonthLabel,
              nextMonthLabel: resolvedLabels.expirationNextMonthLabel,
            }}
            errorText={resolvedLabels.expirationPastDateError}
            onChange={expiration.onChange}
          />
        </div>
      )}
      {shouldShowLink && (
        <div css={styles.inputWrapperStyles}>
          <label htmlFor="generated-public-link" className="visually-hidden">
            {resolvedLabels.generatedPublicLink}
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
            displayText={resolvedLabels.copyLink}
            copySuccessText={resolvedLabels.linkCopied}
          />
        </div>
      )}
      {publicLink.status === 'loading' && (
        <div css={styles.loaderWrapperStyles}>
          <CellsTableLoader />
        </div>
      )}
      {publicLink.status === 'error' && <div>{resolvedLabels.errorLoadingLink}</div>}
    </div>
  );
};
