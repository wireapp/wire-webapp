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

import {FC, FormEvent, MouseEvent, useState, useRef, ChangeEvent, useEffect, useMemo} from 'react';

import {ValidationUtil} from '@wireapp/commons';
import {ErrorMessage} from '@wireapp/react-ui-kit';

import {CopyToClipboardButton} from 'Components/CopyToClipboardButton';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Config} from 'src/script/Config';
import {isEnterKey, isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {isValidPassword} from 'Util/StringUtil';

import {CheckboxOption} from './CheckboxOption/CheckboxOption';
import {MessageContent} from './Content/MessageContent';
import {GuestLinkPasswordForm} from './GuestLinkPasswordForm/GuestLinkPasswordForm';
import {InputForm} from './InputForm/InputForm';
import {JoinGuestLinkPasswordForm} from './JoinGuestLinkPasswordForm/JoinGuestLinkPasswordForm';
import {PasswordAdvancedSecurityForm} from './PasswordAdvancedSecurityForm/PasswordAdvancedSecurityForm';
import {PasswordForm} from './PasswordForm/PasswordForm';
import {PrimaryButton} from './PrimaryButton/PrimaryButton';
import {PrimaryModalButtons} from './PrimaryModalButtons/PrimaryModalButtons';
import {PrimaryModalHeader} from './PrimaryModalHeader/PrimaryModalHeader';
import {PrimaryModalLoading} from './PrimaryModalLoading/PrimaryModalLoading';
import {PrimaryModalShell} from './PrimaryModalShell/PrimaryModalShell';
import {usePrimaryModalState, showNextModalInQueue, defaultContent, removeCurrentModal} from './PrimaryModalState';
import {ButtonAction, PrimaryModalType} from './PrimaryModalTypes';
import {SecondaryButton} from './SecondaryButton/SecondaryButton';

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
  const passwordValueRef = useRef<HTMLInputElement>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const isBackupPasswordValid = useMemo(() => passwordInput === '' || isValidPassword(passwordInput), [passwordInput]);

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
    size = 'small',
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
    setIsFormSubmitted(false);
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

  const areGuestLinkPasswordsValid = checkGuestLinkPassword(passwordValue, passwordConfirmationValue);

  const passwordGuestLinkActionEnabled =
    (!isGuestLinkPassword || !!passwordValue.trim().length) && areGuestLinkPasswordsValid;

  const isPrimaryActionDisabled = (disabled: boolean | undefined) => {
    if (!!disabled) {
      return true;
    }
    if (isConfirm) {
      return false;
    }
    return !inputActionEnabled && !actionEnabled;
  };

  const performAction =
    (action?: Function, closeAfter = true, skipValidation = false) =>
    (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!skipValidation && !inputActionEnabled) {
        return;
      }

      if (hasPasswordWithRules && !isBackupPasswordValid) {
        setIsFormSubmitted(true);
        return;
      }

      // prevent from submit when validation not passed
      if (!skipValidation && isGuestLinkPassword && !areGuestLinkPasswordsValid) {
        setIsFormSubmitted(true);
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
      [PrimaryModalType.PASSWORD_ADVANCED_SECURITY]: () => action(passwordInput, isFormSubmitted),
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

  useEffect(() => {
    const onKeyPress = (event: KeyboardEvent) => {
      if (isEscapeKey(event) && isModalVisible) {
        removeCurrentModal();
        closeAction();
      }

      if (isEnterKey(event) && primaryAction?.runActionOnEnterClick) {
        primaryAction?.action?.();
        removeCurrentModal();
      }
    };

    document.addEventListener('keypress', onKeyPress);
    return () => document.removeEventListener('keypress', onKeyPress);
  }, [primaryAction, isModalVisible]);

  const closeAction = () => {
    if (hasPasswordWithRules) {
      const [closeAction] = secondaryActions;
      closeAction?.action?.();
    }
  };

  const secondaryButtons = secondaryActions
    .filter((action): action is ButtonAction => action !== null && !!action.text)
    .map(action => (
      <SecondaryButton
        key={`${action.text}-${action.uieName}`}
        onClick={performAction(action.action, !!closeOnSecondaryAction, true)}
        disabled={action.disabled}
        fullWidth={hasMultipleSecondary || allButtonsFullWidth}
        uieName={action.uieName}
      >
        {action.text}
      </SecondaryButton>
    ));

  const primaryButton = !!primaryAction?.text && (
    <PrimaryButton
      key="modal-primary-button"
      ref={primaryActionButtonRef}
      onClick={performAction(confirm, !!closeOnConfirm)}
      disabled={isPrimaryActionDisabled(primaryAction.disabled)}
      fullWidth={hasMultipleSecondary || allButtonsFullWidth}
    >
      {primaryAction.text}
    </PrimaryButton>
  );

  const buttons = primaryBtnFirst ? [primaryButton, ...secondaryButtons] : [...secondaryButtons, primaryButton];
  const isPasswordFieldValid = isFormSubmitted && !passwordValueRef.current?.validity.valid;

  const backupPasswordHint = t('backupPasswordHint', {
    minPasswordLength: Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH.toString(),
  });

  return (
    <PrimaryModalShell
      title={titleText}
      isShown={isModalVisible}
      onClose={onModalHidden}
      onBgClick={onBgClick}
      dataUieName={modalUie}
      size={size}
    >
      <PrimaryModalHeader
        titleText={titleText}
        closeBtnTitle={closeBtnTitle}
        hideCloseBtn={hideCloseBtn}
        closeAction={closeAction}
      />
      <FadingScrollbar className="modal__body">
        <MessageContent message={message} messageHtml={messageHtml} />

        {isGuestLinkPassword && (
          <GuestLinkPasswordForm
            onSubmit={performAction(confirm, !!closeOnConfirm)}
            onGeneratePassword={password => {
              setPasswordValue(password);
              setPasswordConfirmationValue(password);
              setIsFormSubmitted(false);
            }}
            passwordValue={passwordValue}
            passwordValueRef={passwordValueRef}
            onPasswordValueChange={setPasswordValue}
            isPasswordInputMarkInvalid={isPasswordFieldValid}
            passwordConfirmationValue={passwordConfirmationValue}
            onPasswordConfirmationChange={setPasswordConfirmationValue}
            isPasswordConfirmationMarkInvalid={isFormSubmitted && !areGuestLinkPasswordsValid}
          />
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
          <PasswordForm
            onSubmit={performAction(confirm, !!closeOnConfirm)}
            inputPlaceholder={inputPlaceholder}
            inputValue={passwordValue}
            onInputChange={setPasswordValue}
          />
        )}

        {isJoinGuestLinkPassword && (
          <JoinGuestLinkPasswordForm
            onSubmit={performAction(confirm, !!closeOnConfirm)}
            inputValue={passwordValue}
            onInputChange={setPasswordValue}
          />
        )}

        {hasPasswordWithRules && (
          <PasswordAdvancedSecurityForm
            onSubmit={performAction(confirm, !!closeOnConfirm)}
            inputValue={passwordInput}
            inputPlaceholder={inputPlaceholder}
            isInputInvalid={isFormSubmitted && !isBackupPasswordValid}
            onInputChange={updatePasswordWithRules}
            inputHelperText={backupPasswordHint}
            {...(isFormSubmitted &&
              !isBackupPasswordValid && {error: <ErrorMessage>{backupPasswordHint}</ErrorMessage>})}
          />
        )}

        {isInput && (
          <InputForm
            onSubmit={performAction(confirm, !!closeOnConfirm)}
            inputValue={inputValue}
            inputPlaceholder={inputPlaceholder}
            onInputChange={updateInputValue}
          />
        )}

        {errorMessage && <div className="modal__input__error">{errorMessage}</div>}

        {isOption && <CheckboxOption isChecked={optionChecked} onChange={onOptionChange} label={checkboxLabel} />}

        {showLoadingIndicator ? (
          <PrimaryModalLoading />
        ) : (
          <PrimaryModalButtons isColumn={hasMultipleSecondary || allButtonsFullWidth}>{buttons}</PrimaryModalButtons>
        )}
      </FadingScrollbar>
    </PrimaryModalShell>
  );
};
