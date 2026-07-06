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

import {useMemo} from 'react';

import {CSSObject, useTheme} from '@emotion/react';
import is from '@sindresorhus/is';
import BaseSelect, {components, MenuPosition, MultiValue, MultiValueRemoveProps, NoticeProps} from 'react-select';
import CreatableSelect from 'react-select/creatable';

import {
  selectStyles,
  noOptionsMessageStyles,
  wrapperStyles,
  loadingMessageStyles,
  labelCSS,
} from './ComboboxSelect.styles';

import {CloseIcon} from '../../DataDisplay/Icon';
import {Theme} from '../../Identity/Theme';
import {InputLabel} from '../InputLabel';
import {BaseSelectDropdownIndicator} from '../Select/BaseSelect/BaseSelectDropdownIndicator';

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
  onCreateOption?: (inputValue: string) => void;
  createOptionLabel?: (inputValue: string) => string;
  noOptionsMessage: string;
  label?: string;
  labelVisuallyHidden?: boolean;
  required?: boolean;
  menuPortalTarget?: HTMLElement;
  menuPosition?: MenuPosition;
  menuListCSS?: CSSObject;
  isLoading?: boolean;
  loadingMessage?: string;
  closeMenuOnSelect?: boolean;
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
  labelVisuallyHidden = false,
  required,
  menuPortalTarget,
  menuPosition = 'absolute',
  menuListCSS,
  isLoading = false,
  loadingMessage,
  closeMenuOnSelect = true,
}: ComboboxSelectProps) => {
  return (
    <div css={wrapperStyles} data-uie-name={dataUieName}>
      {is.nonEmptyString(label) && (
        <InputLabel htmlFor={id} isRequired={required} labelCSS={labelCSS({isVisuallyHidden: labelVisuallyHidden})}>
          {label}
        </InputLabel>
      )}
      <Select
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        isDisabled={isDisabled}
        placeholder={placeholder}
        menuPortalTarget={menuPortalTarget}
        menuPosition={menuPosition}
        createOptionLabel={createOptionLabel}
        onCreateOption={onCreateOption}
        creatable={!!Boolean(onCreateOption)}
        isLoading={isLoading}
        noOptionsMessage={noOptionsMessage}
        loadingMessage={loadingMessage}
        menuListCSS={menuListCSS}
        closeMenuOnSelect={closeMenuOnSelect}
      />
    </div>
  );
};

const Select = ({
  id,
  options,
  value,
  onChange,
  isDisabled = false,
  placeholder,
  onCreateOption,
  createOptionLabel,
  noOptionsMessage,
  menuPortalTarget,
  menuPosition = 'absolute',
  menuListCSS,
  isLoading = false,
  loadingMessage,
  creatable = false,
  closeMenuOnSelect = true,
}: ComboboxSelectProps & {creatable?: boolean}) => {
  const theme = useTheme() as Theme;

  const handleChange = (newValue: MultiValue<ComboboxSelectOption>) => {
    onChange?.([...newValue]);
  };

  const components = useMemo(() => {
    return {
      ClearIndicator: () => null,
      DropdownIndicator: BaseSelectDropdownIndicator,
      MultiValueRemove: (props: MultiValueRemoveProps<ComboboxSelectOption, true>) => <MultiValueRemove {...props} />,
      NoOptionsMessage: (props: NoticeProps<ComboboxSelectOption, true>) => (
        <NoOptionsMessage {...props} message={noOptionsMessage} />
      ),
      LoadingMessage: (props: NoticeProps<ComboboxSelectOption, true>) => (
        <LoadingMessage {...props} message={loadingMessage ?? ''} />
      ),
    };
  }, [loadingMessage, noOptionsMessage]);

  if (!creatable) {
    return (
      <BaseSelect<ComboboxSelectOption, true>
        id={id}
        inputId={id}
        options={options}
        value={value}
        onChange={handleChange}
        isMulti
        isSearchable
        isDisabled={isDisabled}
        placeholder={placeholder}
        menuPortalTarget={menuPortalTarget}
        menuPosition={menuPosition}
        styles={selectStyles({theme, menuListCSS})}
        classNamePrefix="select"
        closeMenuOnSelect={closeMenuOnSelect}
        components={components}
      />
    );
  }

  return (
    <CreatableSelect<ComboboxSelectOption, true>
      id={id}
      inputId={id}
      options={options}
      value={value}
      onChange={handleChange}
      isMulti
      isSearchable
      isDisabled={isDisabled}
      placeholder={placeholder}
      menuPortalTarget={menuPortalTarget}
      menuPosition={menuPosition}
      styles={selectStyles({theme, menuListCSS})}
      classNamePrefix="select"
      formatCreateLabel={createOptionLabel}
      onCreateOption={onCreateOption}
      closeMenuOnSelect={closeMenuOnSelect}
      isLoading={isLoading}
      components={components}
    />
  );
};

const MultiValueRemove = (props: MultiValueRemoveProps<ComboboxSelectOption, true>) => (
  <components.MultiValueRemove {...props}>
    <CloseIcon width={10} height={10} />
  </components.MultiValueRemove>
);

const NoOptionsMessage = ({message, ...props}: NoticeProps<ComboboxSelectOption, true> & {message: string}) => (
  <components.NoOptionsMessage {...props}>
    <div css={noOptionsMessageStyles}>{message}</div>
  </components.NoOptionsMessage>
);

const LoadingMessage = ({message, ...props}: NoticeProps<ComboboxSelectOption, true> & {message: string}) => (
  <components.LoadingMessage {...props}>
    <div css={loadingMessageStyles}>{message}</div>
  </components.LoadingMessage>
);
