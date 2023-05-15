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

import {Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {ModalComponent} from 'Components/ModalComponent';
import {isEscapeKey} from 'Util/KeyboardUtil';

import {usePrimaryModalState, showNextModalInQueue, defaultContent, removeCurrentModal} from './PrimaryModalState';
import {Action, PrimaryModalType} from './PrimaryModalTypes';

export const PrimaryModalComponent: FC = () => {
  const [inputValue, updateInputValue] = useState<string>('');
  const [passwordValue, updatePasswordValue] = useState<string>('');
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
  } = content;
  const hasPassword = currentType === PrimaryModalType.PASSWORD;
  const hasInput = currentType === PrimaryModalType.INPUT;
  const hasOption = currentType === PrimaryModalType.OPTION;
  const hasMultipleSecondary = currentType === PrimaryModalType.MULTI_ACTIONS;
  const onModalHidden = () => {
    updateCurrentModalContent(defaultContent);
    updateInputValue('');
    updatePasswordValue('');
    updateErrorMessage('');
    updateOptionChecked(false);
    showNextModalInQueue();
  };

  const actionEnabled = !hasInput || !!inputValue.trim().length;
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
              <button
                type="button"
                className="modal__header__button"
                onClick={removeCurrentModal}
                aria-label={closeBtnTitle}
                data-uie-name="do-close"
              >
                <Icon.Close className="modal__header__icon" aria-hidden="true" />
              </button>
            </div>

            <FadingScrollbar className="modal__body">
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

              <div className={cx('modal__buttons', {'modal__buttons--column': hasMultipleSecondary})}>
                {secondaryActions
                  .filter((action): action is Action => action !== null && !!action.text)
                  .map(action => (
                    <button
                      key={`${action.text}-${action.uieName}`}
                      type="button"
                      onClick={doAction(action.action, true, true)}
                      data-uie-name={action?.uieName}
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
            </FadingScrollbar>
          </>
        )}
      </ModalComponent>
    </div>
  );
};
