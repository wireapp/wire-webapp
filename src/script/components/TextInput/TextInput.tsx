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

export interface UserInputProps {
  disabled?: boolean;
  errorMessage?: string;
  isError?: boolean;
  isSuccess?: boolean;
  label: string;
  name: string;
  onCancel: () => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onSuccessDismissed?: () => void;
  placeholder: string;
  value: string;
}

const SUCCESS_DISMISS_TIMEOUT = 2500;

const TextInput: React.FC<UserInputProps> = ({
  disabled,
  errorMessage,
  isError,
  isSuccess,
  label,
  name,
  onCancel,
  onChange,
  onSuccessDismissed,
  placeholder,
  value,
}: UserInputProps) => {
  const isFilled = Boolean(value);

  useEffect(() => {
    if (isSuccess && onSuccessDismissed) {
      setTimeout(() => {
        onSuccessDismissed();
      }, SUCCESS_DISMISS_TIMEOUT);
    }
  }, [isSuccess, onSuccessDismissed]);

  let changedColor = null;
  if (isError) {
    changedColor = 'var(--text-input-alert) !important';
  }
  if (isSuccess) {
    changedColor = 'var(--text-input-success) !important';
  }

  return (
    <div css={containerCSS}>
      {isError && errorMessage && (
        <span className="label" css={errorMessageCSS}>
          {errorMessage}
        </span>
      )}
      <input
        className="text-input"
        css={getInputCSS(disabled, changedColor)}
        disabled={disabled}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <label className="label-medium" css={getLabelCSS(changedColor)} htmlFor={name}>
        {label}
      </label>
      {isFilled && !isSuccess && !isError && (
        <button css={cancelButtonCSS} onClick={onCancel}>
          <Icon.Close css={{fill: 'var(--text-input-background)', height: 8, width: 8}} />
        </button>
      )}
      {isSuccess && !isError && <CheckIcon css={getIconCSS(changedColor)} color={COLOR.TEXT} />}
      {isError && <Icon.ExclamationMark css={getIconCSS(changedColor)} color={COLOR.TEXT} />}
    </div>
  );
};

export default TextInput;

registerReactComponent<UserInputProps>('text-input', {
  component: TextInput,
  template: '<div data-bind="react: {label, name, onChange, placeholder, value: ko.unwrap(value)}"></div>',
});
