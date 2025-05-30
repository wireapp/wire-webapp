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

import {CSSObject, useTheme} from '@emotion/react';
import {components, MenuPosition, MultiValueRemoveProps, NoticeProps} from 'react-select';
import CreatableSelect from 'react-select/creatable';

import {selectStyles, noOptionsMessageStyles, wrapperStyles, loadingMessageStyles} from './ComboboxSelect.styles';

import {CloseIcon} from '../../../Icon/CloseIcon';
import {Theme} from '../../../Layout';
import {InputLabel} from '../../InputLabel';
import {BaseSelectDropdownIndicator} from '../BaseSelect/BaseSelectDropdownIndicator';

export type ComboboxSelectOption = {
  value: string | number;
  label: string;
  description?: string;
};

export interface ComboboxSelectProps {
  id: string;
  options: ComboboxSelectOption[];
  value?: ComboboxSelectOption | ComboboxSelectOption[];
  onChange?: (value: ComboboxSelectOption | ComboboxSelectOption[]) => void;
  isDisabled?: boolean;
  placeholder?: string;
  dataUieName?: string;
  onCreateOption: (inputValue: string) => void;
  createOptionLabel: (inputValue: string) => string;
  noOptionsMessage: string;
  label?: string;
  required?: boolean;
  menuPotralTarget?: HTMLElement;
  menuPosition?: MenuPosition;
  menuListCSS?: CSSObject;
  isLoading?: boolean;
  loadingMessage?: string;
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
  menuPotralTarget,
  menuPosition = 'absolute',
  menuListCSS,
  isLoading = false,
  loadingMessage,
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
        isMulti
        isSearchable
        isDisabled={isDisabled}
        placeholder={placeholder}
        menuPortalTarget={menuPotralTarget}
        menuPosition={menuPosition}
        styles={selectStyles({theme, menuListCSS})}
        classNamePrefix="select"
        formatCreateLabel={createOptionLabel}
        onCreateOption={onCreateOption}
        closeMenuOnSelect={false}
        isLoading={isLoading}
        components={{
          ClearIndicator: () => null,
          DropdownIndicator: BaseSelectDropdownIndicator,
          MultiValueRemove: props => <MultiValueRemove {...props} />,
          NoOptionsMessage: props => <NoOptionsMessage {...props} message={noOptionsMessage} />,
          LoadingMessage: props => <LoadingMessage {...props} message={loadingMessage} />,
        }}
      />
    </div>
  );
};

const MultiValueRemove = (props: MultiValueRemoveProps) => (
  <components.MultiValueRemove {...props}>
    <CloseIcon width={10} height={10} />
  </components.MultiValueRemove>
);

const NoOptionsMessage = ({message, ...props}: NoticeProps & {message: string}) => (
  <components.NoOptionsMessage {...props}>
    <div css={noOptionsMessageStyles}>{message}</div>
  </components.NoOptionsMessage>
);

const LoadingMessage = ({message, ...props}: NoticeProps & {message: string}) => (
  <components.LoadingMessage {...props}>
    <div css={loadingMessageStyles}>{message}</div>
  </components.LoadingMessage>
);
