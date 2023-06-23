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

import {Checkbox, CheckboxLabel, COLOR, Form, Input, Link, Text} from '@wireapp/react-ui-kit';

import {CopyToClipboardButton} from 'Components/CopyToClipboardButton';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {ModalComponent} from 'Components/ModalComponent';
import {PasswordGeneratorButton} from 'Components/PasswordGeneratorButton';
import {Config} from 'src/script/Config';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {guestLinkPasswordInputStyles} from './PrimaryModal.styles';
import {usePrimaryModalState, showNextModalInQueue, defaultContent, removeCurrentModal} from './PrimaryModalState';
import {Action, PrimaryModalType} from './PrimaryModalTypes';

export const PrimaryModalComponent: FC = () => {
  const [inputValue, updateInputValue] = useState<string>('');
  const [passwordValue, setPasswordValue] = useState<string>('');
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
    currentType,
    inputPlaceholder,
    messageHtml,
    messageText,
    modalUie,
    onBgClick,
    primaryAction,
    secondaryAction,
    titleText,
    closeBtnTitle,
    passwordGenerator,
    copyPassword,
    hideCloseBtn = false,
  } = content;

  const isPassword = currentType === PrimaryModalType.PASSWORD;
  const isInput = currentType === PrimaryModalType.INPUT;
  const isOption = currentType === PrimaryModalType.OPTION;
  const isMultipleSecondary = currentType === PrimaryModalType.MULTI_ACTIONS;
  const isGuestLinkPassword = currentType === PrimaryModalType.GUEST_LINK_PASSWORD;
  const isJoinGuestLinkPassword = currentType === PrimaryModalType.JOIN_GUEST_LINK_PASSWORD;

  const onModalHidden = () => {
    updateCurrentModalContent(defaultContent);
    updateInputValue('');
    setPasswordValue('');
    updateErrorMessage('');
    updateOptionChecked(false);
    showNextModalInQueue();
    setPasswordConfirmationValue('');
    setDidCopyPassword(false);
  };

  const inputActionEnabled = !isInput || !!inputValue.trim().length;
  const passwordActionEnabled =
    (!isGuestLinkPassword || !!passwordValue.trim().length) && passwordValue === passwordConfirmationValue;
  console.info('bardia', {inputActionEnabled, passwordActionEnabled});
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
    if (typeof action !== 'function') {
      return;
    }
    if (isGuestLinkPassword) {
      action(passwordValue, didCopyPassword);
      return;
    }
    const actions = {
      [PrimaryModalType.OPTION]: () => action(optionChecked),
      [PrimaryModalType.INPUT]: () => action(inputValue),
      [PrimaryModalType.PASSWORD]: () => action(passwordValue),
      [PrimaryModalType.GUEST_LINK_PASSWORD]: () => action(passwordValue),
      [PrimaryModalType.JOIN_GUEST_LINK_PASSWORD]: () => action(passwordValue),
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
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalVisible]);

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
                  onClick={removeCurrentModal}
                  aria-label={closeBtnTitle}
                  data-uie-name="do-close"
                >
                  <Icon.Close className="modal__header__icon" aria-hidden="true" />
                </button>
              )}
            </div>

            <FadingScrollbar className="modal__body">
              {(messageHtml || messageText) && (
                <div className="modal__text" data-uie-name="status-modal-text">
                  {messageHtml && <p id="modal-description-html" dangerouslySetInnerHTML={{__html: messageHtml}} />}
                  {messageText && <p id="modal-description-text">{messageText}</p>}
                </div>
              )}

              {passwordGenerator && (
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
                    helperText={t('modalGuestLinkJoinHelperText')}
                    id="modal_pswd_confiramtion"
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
                    id="modal_pswd_confiramtion"
                    autoComplete="off"
                    value={passwordConfirmationValue}
                    onChange={event => setPasswordConfirmationValue(event.currentTarget.value)}
                  />
                </Form>
              )}

              {copyPassword && (
                <CopyToClipboardButton
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

              <div className={cx('modal__buttons', {'modal__buttons--column': isMultipleSecondary})}>
                {secondaryActions
                  .filter((action): action is Action => action !== null && !!action.text)
                  .map(action => (
                    <button
                      key={`${action.text}-${action.uieName}`}
                      type="button"
                      onClick={doAction(action.action, true, true)}
                      data-uie-name={action?.uieName}
                      className={cx('modal__button modal__button--secondary', {
                        'modal__button--full': isMultipleSecondary,
                      })}
                    >
                      {action.text}
                    </button>
                  ))}
                {primaryAction?.text && (
                  <button
                    ref={primaryActionButtonRef}
                    type="button"
                    onClick={doAction(confirm, !!closeOnConfirm)}
                    disabled={!inputActionEnabled || !passwordActionEnabled}
                    className={cx('modal__button modal__button--primary', {
                      'modal__button--full': isMultipleSecondary,
                    })}
                    data-uie-name="do-action"
                  >
                    {primaryAction.text}
                  </button>
                )}
              </div>
            </FadingScrollbar>
          </>
        )}
      </ModalComponent>
    </div>
  );
};
