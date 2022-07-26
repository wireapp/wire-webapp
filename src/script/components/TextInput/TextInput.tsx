/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import {CheckIcon, COLOR} from '@wireapp/react-ui-kit';
import {
  cancelButtonCSS,
  containerCSS,
  errorMessageCSS,
  getIconCSS,
  getInputCSS,
  getLabelCSS,
} from 'Components/TextInput/TextInput.styles';
import {t} from 'Util/LocalizerUtil';

export interface UserInputProps {
  autoFocus?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  isError?: boolean;
  isSuccess?: boolean;
  label: string;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onCancel: () => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onSuccessDismissed?: () => void;
  placeholder?: string;
  value?: string;
  uieName?: string;
  errorUieName?: string;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  setIsEditing: (x: boolean) => void;
}

const SUCCESS_DISMISS_TIMEOUT = 2500;

const TextInput: React.ForwardRefRenderFunction<HTMLInputElement, UserInputProps> = (
  {
    autoFocus,
    disabled,
    errorMessage,
    isError,
    isSuccess,
    label,
    name,
    onCancel,
    onChange,
    onBlur,
    onKeyDown,
    onSuccessDismissed,
    placeholder,
    value,
    uieName,
    errorUieName,
    inputWrapperRef,
    setIsEditing,
  }: UserInputProps,
  ref: React.ForwardedRef<HTMLInputElement>,
) => {
  const isFilled = Boolean(value);

  useEffect(() => {
    if (isSuccess && onSuccessDismissed) {
      setTimeout(() => {
        onSuccessDismissed();
      }, SUCCESS_DISMISS_TIMEOUT);
    }
  }, [isSuccess, onSuccessDismissed]);

  let changedColor = undefined;
  if (isError) {
    changedColor = 'var(--text-input-alert) !important';
  }
  if (isSuccess) {
    changedColor = 'var(--text-input-success) !important';
  }

  return (
    <div css={containerCSS} ref={inputWrapperRef}>
      {isError && errorMessage && (
        <span className="label" css={errorMessageCSS} data-uie-name={errorUieName}>
          {errorMessage}
        </span>
      )}

      {/* eslint jsx-a11y/no-autofocus : "off" */}
      <input
        autoFocus={autoFocus}
        className="text-input"
        css={getInputCSS(disabled, changedColor)}
        disabled={disabled}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        ref={ref}
        data-uie-name={uieName}
      />
      <label className="label-medium" css={getLabelCSS(changedColor)} htmlFor={name}>
        {label}
      </label>
      {isFilled && !isSuccess && !isError && (
        <button
          type="button"
          css={cancelButtonCSS}
          onClick={onCancel}
          aria-label={t('accessibility.userProfileDeleteEntry')}
          onKeyDown={event => {
            if (event.shiftKey && event.key === 'Tab') {
              // shift+tab from clear button should focus on the input field
              setIsEditing(true);
            } else if (event.key === 'Tab') {
              // tab from clear button should close the editable field
              setIsEditing(false);
            }
          }}
        >
          <Icon.Close css={{fill: 'var(--text-input-background)', height: 8, width: 8}} />
        </button>
      )}
      {isSuccess && !isError && <CheckIcon css={getIconCSS(changedColor)} color={COLOR.TEXT} />}
      {isError && <Icon.ExclamationMark css={getIconCSS(changedColor)} color={COLOR.TEXT} />}
    </div>
  );
};

const TextInputForwarded = React.forwardRef(TextInput);

export default TextInputForwarded;

registerReactComponent('text-input', TextInputForwarded);
