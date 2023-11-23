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
import {Checkbox, CheckboxLabel, Input, Loading} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {ModalComponent} from 'Components/ModalComponent';
import {Config} from 'src/script/Config';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {usePrimaryModalState, showNextModalInQueue, defaultContent, removeCurrentModal} from './PrimaryModalState';
import {Action, PrimaryModalType} from './PrimaryModalTypes';

export const PrimaryModalComponent: FC = () => {
  const [inputValue, updateInputValue] = useState<string>('');
  const [passwordValue, updatePasswordValue] = useState<string>('');
  const [passwordInput, updatePasswordWithRules] = useState<string>('');
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
    hideCloseBtn = false,
    passwordOptional = false,
  } = content;
  const showLoadingIndicator = currentType === PrimaryModalType.LOADING;
  const hasPassword = currentType === PrimaryModalType.PASSWORD;
  const hasPasswordWithRules = currentType === PrimaryModalType.PASSWORD_ADVANCED_SECURITY;
  const hasInput = currentType === PrimaryModalType.INPUT;
  const hasOption = currentType === PrimaryModalType.OPTION;
  const hasMultipleSecondary = currentType === PrimaryModalType.MULTI_ACTIONS;
  const onModalHidden = () => {
    updateCurrentModalContent(defaultContent);
    updateInputValue('');
    updatePasswordValue('');
    updatePasswordWithRules('');
    updateErrorMessage('');
    updateOptionChecked(false);
    showNextModalInQueue();
  };
  const isPasswordOptional = () => {
    const skipValidation = passwordOptional && !passwordInput.trim().length;
    if (skipValidation) {
      return true;
    }
    return passwordRegex.test(passwordInput);
  };

  const passwordRegex = new RegExp(
    ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH),
  );
  const actionEnabled =
    (!hasInput || !!inputValue.trim().length) && (hasPasswordWithRules ? isPasswordOptional() : true);

  const doAction =
    (action?: Function, closeAfter = true, skipValidation = false) =>
    (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!skipValidation && !actionEnabled) {
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
    if (typeof action === 'function') {
      const actions = {
        [PrimaryModalType.OPTION]: () => action(optionChecked),
        [PrimaryModalType.INPUT]: () => action(inputValue),
        [PrimaryModalType.PASSWORD]: () => action(passwordValue),
        [PrimaryModalType.PASSWORD_ADVANCED_SECURITY]: () => action(passwordInput),
      };
      if (Object.keys(actions).includes(content?.currentType ?? '')) {
        actions[content?.currentType as keyof typeof actions]();
        return;
      }
      action();
    }
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

            <FadingScrollbar
              className={cx('modal__body', {'modal__body--actions': primaryAction && !hasMultipleSecondary})}
            >
              {(messageHtml || messageText) && (
                <div className="modal__text" data-uie-name="status-modal-text">
                  {messageHtml && <p id="modal-description-html" dangerouslySetInnerHTML={{__html: messageHtml}} />}
                  {messageText && <p id="modal-description-text">{messageText}</p>}
                </div>
              )}

              {hasPassword && (
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
                    onChange={event => updatePasswordValue(event.target.value)}
                  />
                </form>
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

              {hasInput && (
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

              {hasOption && (
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
                <div className={cx('modal__buttons', {'modal__buttons--column': hasMultipleSecondary})}>
                  {secondaryActions
                    .filter((action): action is Action => action !== null && !!action.text)
                    .map(action => (
                      <button
                        key={`${action.text}-${action.uieName}`}
                        type="button"
                        onClick={doAction(action.action, true, true)}
                        data-uie-name={action.uieName}
                        className={cx('modal__button modal__button--secondary', {
                          'modal__button--full': hasMultipleSecondary,
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
                      disabled={!actionEnabled}
                      className={cx('modal__button modal__button--primary', {
                        'modal__button--full': hasMultipleSecondary,
                      })}
                      data-uie-name="do-action"
                    >
                      {primaryAction.text}
                    </button>
                  )}
                </div>
              )}
            </FadingScrollbar>
          </>
        )}
      </ModalComponent>
    </div>
  );
};
