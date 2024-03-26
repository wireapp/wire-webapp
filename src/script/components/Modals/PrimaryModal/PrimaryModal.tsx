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

import {FC, FormEvent, MouseEvent, useState, useRef, ChangeEvent, useEffect} from 'react';

import cx from 'classnames';

import {ValidationUtil} from '@wireapp/commons';
import {Checkbox, CheckboxLabel, COLOR, Form, Link, Text, Input, Loading} from '@wireapp/react-ui-kit';

import {CopyToClipboardButton} from 'Components/CopyToClipboardButton';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {ModalComponent} from 'Components/ModalComponent';
import {PasswordGeneratorButton} from 'Components/PasswordGeneratorButton';
import {Config} from 'src/script/Config';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {isValidPassword} from 'Util/StringUtil';

import {MessageContent} from './Content/MessageContent';
import {guestLinkPasswordInputStyles} from './PrimaryModal.styles';
import {usePrimaryModalState, showNextModalInQueue, defaultContent, removeCurrentModal} from './PrimaryModalState';
import {ButtonAction, PrimaryModalType} from './PrimaryModalTypes';

export const PrimaryModalComponent: FC = () => {
  const [inputValue, updateInputValue] = useState<string>('');
  const [passwordValue, setPasswordValue] = useState<string>('');
  const [passwordInput, updatePasswordWithRules] = useState<string>('');
  const [passwordConfirmationValue, setPasswordConfirmationValue] = useState<string>('');
  const [didCopyPassword, setDidCopyPassword] = useState<boolean>(false);
  const [optionChecked, updateOptionChecked] = useState<boolean>(false);
  const content = usePrimaryModalState(state => state.currentModalContent);
  const errorMessage = usePrimaryModalState(state => state.errorMessage);
  const updateErrorMessage = usePrimaryModalState(state => state.updateErrorMessage);
  const updateCurrentModalContent = usePrimaryModalState(state => state.updateCurrentModalContent);
  const currentId = usePrimaryModalState(state => state.currentModalId);
  const primaryActionButtonRef = useRef<HTMLButtonElement>(null);
  const isModalVisible = currentId !== null;
  const {
    checkboxLabel,
    closeOnConfirm,
    closeOnSecondaryAction,
    currentType,
    inputPlaceholder,
    message,
    messageHtml,
    modalUie,
    onBgClick,
    primaryAction,
    secondaryAction,
    titleText,
    closeBtnTitle,
    copyPassword,
    hideCloseBtn = false,
    passwordOptional = false,
    allButtonsFullWidth = false,
    primaryBtnFirst = false,
  } = content;

  const isPassword = currentType === PrimaryModalType.PASSWORD;
  const showLoadingIndicator = currentType === PrimaryModalType.LOADING;
  const hasPasswordWithRules = currentType === PrimaryModalType.PASSWORD_ADVANCED_SECURITY;
  const isInput = currentType === PrimaryModalType.INPUT;
  const isOption = currentType === PrimaryModalType.OPTION;
  const hasMultipleSecondary = currentType === PrimaryModalType.MULTI_ACTIONS;
  const isGuestLinkPassword = currentType === PrimaryModalType.GUEST_LINK_PASSWORD;
  const isJoinGuestLinkPassword = currentType === PrimaryModalType.JOIN_GUEST_LINK_PASSWORD;
  const isConfirm = currentType === PrimaryModalType.CONFIRM;

  const isPasswordRequired = hasPasswordWithRules || isGuestLinkPassword;

  const onModalHidden = () => {
    updateCurrentModalContent(defaultContent);
    updateInputValue('');
    setPasswordValue('');
    updatePasswordWithRules('');
    updateErrorMessage('');
    updateOptionChecked(false);
    showNextModalInQueue();
    setPasswordConfirmationValue('');
    setDidCopyPassword(false);
  };

  const isPasswordOptional = () => {
    const skipValidation = passwordOptional && !passwordInput.trim().length;
    if (skipValidation) {
      return true;
    }
    return passwordRegex.test(passwordInput);
  };
  const checkGuestLinkPassword = (password: string, passwordConfirm: string): boolean => {
    if (password !== passwordConfirm) {
      return false;
    }
    return isValidPassword(password);
  };

  const passwordRegex = new RegExp(
    ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH),
  );
  const actionEnabled = isPasswordRequired ? isPasswordOptional() : true;
  const inputActionEnabled = !isInput || !!inputValue.trim().length;

  const passwordGuestLinkActionEnabled =
    (!isGuestLinkPassword || !!passwordValue.trim().length) &&
    checkGuestLinkPassword(passwordValue, passwordConfirmationValue);

  const isPrimaryActionDisabled = (disabled: boolean | undefined) => {
    if (!!disabled) {
      return true;
    }
    if (isConfirm) {
      return false;
    }
    return (!inputActionEnabled || !passwordGuestLinkActionEnabled) && !actionEnabled;
  };

  const doAction =
    (action?: Function, closeAfter = true, skipValidation = false) =>
    (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!skipValidation && !inputActionEnabled) {
        return;
      }
      if (typeof action === 'function') {
        action();
      }
      if (closeAfter) {
        removeCurrentModal();
      }
    };

  const confirm = () => {
    const action = content?.primaryAction?.action;
    if (!action) {
      return;
    }
    const actions = {
      [PrimaryModalType.OPTION]: () => action(optionChecked),
      [PrimaryModalType.INPUT]: () => action(inputValue),
      [PrimaryModalType.PASSWORD]: () => action(passwordValue),
      [PrimaryModalType.GUEST_LINK_PASSWORD]: () => action(passwordValue, didCopyPassword),
      [PrimaryModalType.JOIN_GUEST_LINK_PASSWORD]: () => action(passwordValue),
      [PrimaryModalType.PASSWORD_ADVANCED_SECURITY]: () => action(passwordInput),
    };

    if (Object.keys(actions).includes(content?.currentType ?? '')) {
      actions[content?.currentType as keyof typeof actions]();
      return;
    }
    action();
  };

  const onOptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateOptionChecked(event.target.checked);
    if (primaryActionButtonRef && primaryActionButtonRef.current) {
      primaryActionButtonRef.current.focus();
    }
  };

  const secondaryActions = Array.isArray(secondaryAction) ? secondaryAction : [secondaryAction];

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isModalVisible) {
      modalRef.current?.focus();
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (isEscapeKey(event) && isModalVisible) {
        removeCurrentModal();
        closeAction();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalVisible]);

  const closeAction = () => {
    if (hasPasswordWithRules) {
      const [closeAction] = secondaryActions;
      closeAction?.action?.();
    }
  };

  const secondaryButtons = secondaryActions
    .filter((action): action is ButtonAction => action !== null && !!action.text)
    .map(action => (
      <button
        key={`${action.text}-${action.uieName}`}
        type="button"
        onClick={doAction(action.action, !!closeOnSecondaryAction, true)}
        data-uie-name={action.uieName}
        className={cx('modal__button modal__button--secondary', {
          'modal__button--full': hasMultipleSecondary || allButtonsFullWidth,
        })}
        disabled={action.disabled || false}
      >
        {action.text}
      </button>
    ));

  const primaryButton = !!primaryAction?.text && (
    <button
      ref={primaryActionButtonRef}
      type="button"
      onClick={doAction(confirm, !!closeOnConfirm)}
      disabled={isPrimaryActionDisabled(primaryAction.disabled)}
      className={cx('modal__button modal__button--primary', {
        'modal__button--full': hasMultipleSecondary || allButtonsFullWidth,
      })}
      data-uie-name="do-action"
      key={`modal-primary-button`}
    >
      {primaryAction.text}
    </button>
  );

  const buttons = primaryBtnFirst ? [primaryButton, ...secondaryButtons] : [...secondaryButtons, primaryButton];

  return (
    <div
      id="modals"
      data-uie-name="primary-modals-container"
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
      tabIndex={-1}
      ref={modalRef}
    >
      <ModalComponent isShown={isModalVisible} onClosed={onModalHidden} onBgClick={onBgClick} data-uie-name={modalUie}>
        {isModalVisible && (
          <>
            <div className="modal__header" data-uie-name="status-modal-title">
              {titleText && (
                <h2 className="modal__header__title" id="modal-title">
                  {titleText}
                </h2>
              )}
              {!hideCloseBtn && (
                <button
                  type="button"
                  className="modal__header__button"
                  onClick={() => {
                    removeCurrentModal();
                    closeAction();
                  }}
                  aria-label={closeBtnTitle}
                  data-uie-name="do-close"
                >
                  <Icon.Close className="modal__header__icon" aria-hidden="true" />
                </button>
              )}
            </div>

            <FadingScrollbar className="modal__body">
              <MessageContent message={message} messageHtml={messageHtml} />

              {isGuestLinkPassword && (
                <PasswordGeneratorButton
                  passwordLength={Config.getConfig().MINIMUM_PASSWORD_LENGTH}
                  onGeneratePassword={password => {
                    setPasswordValue(password);
                    setPasswordConfirmationValue(password);
                  }}
                />
              )}

              {isGuestLinkPassword && (
                <Form
                  name="guest-password-link-form"
                  data-uie-name="guest-password-link-form"
                  onSubmit={doAction(confirm, !!closeOnConfirm)}
                  autoComplete="off"
                >
                  <Input
                    name="guest-link-password"
                    required
                    wrapperCSS={guestLinkPasswordInputStyles}
                    placeholder={t('modalGuestLinkJoinPlaceholder')}
                    label={t('modalGuestLinkJoinLabel')}
                    helperText={t('modalGuestLinkJoinHelperText', {
                      minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH.toString(),
                    })}
                    id="modal_pswd"
                    className="modal__input"
                    type="password"
                    autoComplete="off"
                    value={passwordValue}
                    onChange={event => setPasswordValue(event.currentTarget.value)}
                  />
                  <Input
                    name="guest-link-password-confirm"
                    required
                    wrapperCSS={guestLinkPasswordInputStyles}
                    placeholder={t('modalGuestLinkJoinConfirmPlaceholder')}
                    label={t('modalGuestLinkJoinConfirmLabel')}
                    className="modal__input"
                    type="password"
                    id="modal_pswd_confirmation"
                    autoComplete="off"
                    value={passwordConfirmationValue}
                    onChange={event => setPasswordConfirmationValue(event.currentTarget.value)}
                  />
                </Form>
              )}

              {copyPassword && (
                <CopyToClipboardButton
                  disabled={!passwordGuestLinkActionEnabled}
                  textToCopy={passwordValue}
                  displayText={t('guestOptionsPasswordCopyToClipboard')}
                  copySuccessText={t('guestOptionsPasswordCopyToClipboardSuccess')}
                  onCopySuccess={() => setDidCopyPassword(true)}
                />
              )}

              {isPassword && (
                <form onSubmit={doAction(confirm, !!closeOnConfirm)}>
                  <label htmlFor="modal_pswd" className="visually-hidden">
                    {inputPlaceholder}
                  </label>

                  <input
                    id="modal_pswd"
                    className="modal__input"
                    type="password"
                    value={passwordValue}
                    placeholder={inputPlaceholder}
                    onChange={event => setPasswordValue(event.target.value)}
                  />
                </form>
              )}

              {isJoinGuestLinkPassword && (
                <Form
                  name="guest-password-join-form"
                  data-uie-name="guest-password-join-form"
                  onSubmit={doAction(confirm, !!closeOnConfirm)}
                  autoComplete="off"
                >
                  <label
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      lineHeight: '1rem',
                      color: 'var(--text-input-label)',
                      marginBottom: 2,
                    }}
                    htmlFor="modal_pswd"
                  >
                    {t('guestLinkPasswordModal.passwordInputLabel')}
                  </label>

                  <input
                    style={{
                      boxShadow: '0 0 0 1px var(--text-input-border)',
                      borderRadius: 12,
                      margin: 0,
                    }}
                    id="modal_pswd"
                    className="modal__input"
                    type="password"
                    value={passwordValue}
                    placeholder={t('guestLinkPasswordModal.passwordInputPlaceholder')}
                    onChange={event => setPasswordValue(event.target.value)}
                  />

                  <Link
                    style={{marginTop: 24}}
                    href={Config.getConfig().URL.SUPPORT.LEARN_MORE_ABOUT_GUEST_LINKS}
                    target="_blank"
                  >
                    <Text block color={COLOR.BLUE} style={{textDecoration: 'underline', marginBottom: 24}}>
                      {t('guestLinkPasswordModal.learnMoreLink')}
                    </Text>
                  </Link>
                </Form>
              )}

              {hasPasswordWithRules && (
                <form onSubmit={doAction(confirm, !!closeOnConfirm)}>
                  <Input
                    id="modal_pswd_with_rules"
                    type="password"
                    value={passwordInput}
                    placeholder={inputPlaceholder}
                    required
                    data-uie-name="backup-password"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      updatePasswordWithRules(event.target.value)
                    }
                    autoComplete="password"
                    pattern=".{2,64}"
                    helperText={t('backupPasswordHint', {
                      minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH.toString(),
                    })}
                  />
                </form>
              )}

              {isInput && (
                <form onSubmit={doAction(confirm, !!closeOnConfirm)}>
                  <label htmlFor="modal-input" className="visually-hidden">
                    {inputPlaceholder}
                  </label>

                  <input
                    maxLength={64}
                    className="modal__input"
                    id="modal-input"
                    value={inputValue}
                    placeholder={inputPlaceholder}
                    onChange={event => updateInputValue(event.target.value)}
                  />
                </form>
              )}

              {errorMessage && <div className="modal__input__error">{errorMessage}</div>}

              {isOption && (
                <div className="modal-option">
                  <Checkbox
                    checked={optionChecked}
                    data-uie-name="modal-option-checkbox"
                    id="clear-data-checkbox"
                    onChange={onOptionChange}
                  >
                    <CheckboxLabel className="label-xs" htmlFor="clear-data-checkbox">
                      {checkboxLabel}
                    </CheckboxLabel>
                  </Checkbox>
                </div>
              )}

              {showLoadingIndicator ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '1.5rem 0 2rem 0',
                  }}
                >
                  <Loading />
                </div>
              ) : (
                <div
                  className={cx('modal__buttons', {
                    'modal__buttons--column': hasMultipleSecondary || allButtonsFullWidth,
                  })}
                >
                  {buttons}
                </div>
              )}
            </FadingScrollbar>
          </>
        )}
      </ModalComponent>
    </div>
  );
};
