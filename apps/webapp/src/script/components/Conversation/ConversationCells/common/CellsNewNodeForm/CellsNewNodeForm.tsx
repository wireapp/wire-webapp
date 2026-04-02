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

import {ChangeEvent, FormEvent} from 'react';

import {TextInput} from 'Components/TextInput';

import {inputWrapperStyles} from './CellsNewNodeForm.styles';

import {useInputAutoFocus} from '../useInputAutoFocus/useInputAutoFocus';

interface CellsNewNodeFormProps {
  label: string;
  placeholder: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  inputValue: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  error: string | null;
  isOpen: boolean;
}

export const CellsNewNodeForm = ({
  label,
  placeholder,
  onSubmit,
  inputValue,
  onChange,
  onClear,
  error,
  isOpen,
}: CellsNewNodeFormProps) => {
  const {inputRef} = useInputAutoFocus({enabled: isOpen});

  return (
    <form onSubmit={onSubmit}>
      <div css={inputWrapperStyles}>
        <TextInput
          label={label}
          name="cells-new-item-name"
          value={inputValue}
          ref={inputRef}
          placeholder={placeholder}
          onChange={onChange}
          onCancel={onClear}
          isError={Boolean(error)}
          errorMessage={error ?? undefined}
          uieName="cells-new-item-name"
          errorUieName="cells-new-item-name-error"
        />
      </div>
    </form>
  );
};
