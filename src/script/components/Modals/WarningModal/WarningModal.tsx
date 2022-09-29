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

import React, {useState} from 'react';
import cx from 'classnames';

import Icon from 'Components/Icon';
import ModalComponent from 'Components/ModalComponent';
import {initFadingScrollbar} from '../../../ui/fadingScrollbar';
import renderElement from 'Util/renderElement';
import {Action, WarningModalType} from './WarningModalTypes';
import {useWarningModalState, showNextModalInQueue, defaultContent, removeCurrentModal} from './WarningModalState';

export interface WarningModalProps {}

const WarningModalComponent: React.FC = () => {
  const [inputValue, updateInputValue] = useState<string>('');
  const [passwordValue, updatePasswordValue] = useState<string>('');
  const [optionChecked, updateOptionChecked] = useState<boolean>(false);
  const content = useWarningModalState(state => state.currentModalContent);
  const errorMessage = useWarningModalState(state => state.errorMessage);
  const updateErrorMessage = useWarningModalState(state => state.updateErrorMessage);
  const updateCurrentModalContent = useWarningModalState(state => state.updateCurrentModalContent);
  const currentId = useWarningModalState(state => state.currentModalId);
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
  } = content || defaultContent;
  const hasPassword = currentType === WarningModalType.PASSWORD;
  const hasInput = currentType === WarningModalType.INPUT;
  const hasOption = currentType === WarningModalType.OPTION;
  const hasMultipleSecondary = currentType === WarningModalType.MULTI_ACTIONS;
  const onModalHidden = () => {
    updateCurrentModalContent(defaultContent);
    updateInputValue('');
    updatePasswordValue('');
    updateErrorMessage('');
    updateOptionChecked(false);
    showNextModalInQueue();
  };

  const actionEnabled = !hasInput || !!inputValue.trim().length;
  const doAction = (action: Function, closeAfter: boolean, skipValidation = false) => {
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
        [WarningModalType.OPTION]: action(optionChecked),
        [WarningModalType.INPUT]: action(inputValue),
        [WarningModalType.PASSWORD]: action(passwordValue),
      };
      if (content?.currentType) {
        actions[content.currentType as keyof typeof actions]();
        return;
      }
      action();
    }
  };

  const secondaryActions = Array.isArray(secondaryAction) ? secondaryAction : [secondaryAction];

  return (
    <div id="modals">
      <ModalComponent
        isShown={isModalVisible}
        onClosed={onModalHidden}
        aria-describedby="modal-description"
        onBgClick={onBgClick}
        data-uie-name={modalUie}
      >
        {isModalVisible && (
          <>
            <div className="modal__header" data-uie-name="status-modal-title">
              <h2 className="modal__header__title" id="modal-title">
                {titleText}
              </h2>
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
            <div className="modal__body" ref={initFadingScrollbar}>
              {(messageHtml || messageText) && (
                <div className="modal__text" data-uie-name="status-modal-text">
                  {messageHtml && <div id="modal-description-html" dangerouslySetInnerHTML={{__html: messageHtml}} />}
                  {messageText && <div id="modal-description-text">{messageText}</div>}
                </div>
              )}
              {hasPassword && (
                <form onSubmit={() => doAction(confirm, !!closeOnConfirm)}>
                  <input
                    className="modal__input"
                    type="password"
                    value={passwordValue}
                    placeholder={inputPlaceholder ?? ''}
                  />
                </form>
              )}
              {hasInput && (
                <form onSubmit={() => doAction(confirm, !!closeOnConfirm)}>
                  <input
                    maxLength={64}
                    className="modal__input"
                    value={inputValue}
                    placeholder={inputPlaceholder ?? ''}
                  />
                </form>
              )}
              {errorMessage && <div className="modal__input__error">{errorMessage}</div>}
              {hasOption && (
                <div className="modal-option">
                  <div className="checkbox accent-text">
                    <input
                      className="modal-checkbox"
                      type="checkbox"
                      id="clear-data-checkbox"
                      checked={optionChecked}
                      data-uie-name="modal-option-checkbox"
                    />
                    <label className="label-xs" htmlFor="clear-data-checkbox">
                      <span className="modal-option-text text-background">{checkboxLabel}</span>
                    </label>
                  </div>
                </div>
              )}
              <div className={cx('modal__buttons', {'modal__buttons--column': hasMultipleSecondary})}>
                {secondaryActions
                  .filter((action): action is Action => action !== null)
                  .map(action => (
                    <button
                      key={`${action?.text}-${action?.uieName}`}
                      type="button"
                      onClick={() => action?.action && doAction(action?.action, true, true)}
                      data-uie-name={action?.uieName}
                      className={cx('modal__button modal__button--secondary', {
                        'modal__button--full': hasMultipleSecondary,
                      })}
                    >
                      {action?.text}
                    </button>
                  ))}
                {primaryAction?.text && (
                  <button
                    type="button"
                    onClick={() => doAction(confirm, !!closeOnConfirm)}
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
            </div>
          </>
        )}
      </ModalComponent>
    </div>
  );
};

export default WarningModalComponent;

export const initWarningModal = () => {
  renderElement<WarningModalProps>(WarningModalComponent)({});
  showNextModalInQueue();
};
