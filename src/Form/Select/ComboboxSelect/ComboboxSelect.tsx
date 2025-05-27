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

import {useTheme} from '@emotion/react';
import {components, MultiValueRemoveProps, NoticeProps} from 'react-select';
import CreatableSelect from 'react-select/creatable';

import {customStyles, noOptionsMessageStyles, wrapperStyles} from './ComboboxSelect.styles';

import {CloseIcon} from '../../../Icon/CloseIcon';
import {Theme} from '../../../Layout';
import {InputLabel} from '../../InputLabel';
import {BaseSelectDropdownIndicator} from '../BaseSelect/BaseSelectDropdownIndicator';
import {Option} from '../Select';

export interface ComboboxSelectProps {
  id: string;
  options: Option[];
  value?: Option | Option[];
  onChange?: (value: Option | Option[]) => void;
  isDisabled?: boolean;
  placeholder?: string;
  dataUieName?: string;
  onCreateOption: (inputValue: string) => void;
  createOptionLabel: (inputValue: string) => string;
  noOptionsMessage: string;
  label?: string;
  required?: boolean;
}

export const ComboboxSelect = ({
  id,
  options,
  value,
  onChange,
  isDisabled = false,
  placeholder,
  dataUieName,
  onCreateOption,
  createOptionLabel,
  noOptionsMessage,
  label,
  required,
}: ComboboxSelectProps) => {
  const theme = useTheme() as Theme;

  return (
    <div css={wrapperStyles} data-uie-name={dataUieName}>
      {label && (
        <InputLabel htmlFor={id} isRequired={required}>
          {label}
        </InputLabel>
      )}
      <CreatableSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        isMulti={true}
        isSearchable={true}
        isDisabled={isDisabled}
        placeholder={placeholder}
        styles={customStyles({theme})}
        classNamePrefix="select"
        formatCreateLabel={createOptionLabel}
        onCreateOption={onCreateOption}
        closeMenuOnSelect={false}
        components={{
          ClearIndicator: () => null,
          DropdownIndicator: BaseSelectDropdownIndicator,
          MultiValueRemove: props => <MultiValueRemove {...props} theme={theme} />,
          NoOptionsMessage: props => <NoOptionsMessage {...props} message={noOptionsMessage} />,
        }}
      />
    </div>
  );
};

const MultiValueRemove = ({theme, ...props}: MultiValueRemoveProps & {theme: Theme}) => (
  <components.MultiValueRemove {...props}>
    <CloseIcon width={10} height={10} />
  </components.MultiValueRemove>
);

const NoOptionsMessage = ({message, ...props}: NoticeProps & {message: string}) => (
  <components.NoOptionsMessage {...props}>
    <div css={noOptionsMessageStyles}>{message}</div>
  </components.NoOptionsMessage>
);
