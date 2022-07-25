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

/** @jsx jsx */
import {CSSObject, jsx} from '@emotion/react';
import {useTheme} from '@emotion/react';
import React, {FC, ReactElement} from 'react';
import ReactSelect from 'react-select';
import {StylesConfig} from 'react-select/dist/declarations/src/styles';
import {StateManagerProps} from 'react-select/dist/declarations/src/useStateManager';

import {customStyles} from './SelectStyles';
import {CustomOption, DropdownIndicator, IndicatorsContainer, Menu, ValueContainer} from './SelectComponents';
import type {Theme} from '../Layout';
import InputLabel from './InputLabel';

export type Option = {
  value: string | number;
  label: string;
  description?: string;
  isDisabled?: boolean;
};

interface SelectProps extends StateManagerProps<Option> {
  id: string;
  dataUieName: string;
  options: Option[];
  wrapperCSS?: CSSObject;
  label?: string;
  helperText?: string;
  error?: ReactElement;
  markInvalid?: boolean;
  required?: boolean;
  isMulti?: boolean;
  /**In the multi-select case, onChange's value will be an array of all the currently selected values. */
  onChange?: (value: Option | Option[]) => void;
}

export const Select: FC<SelectProps> = ({
  id,
  label,
  error,
  helperText,
  dataUieName,
  options,
  wrapperCSS = {},
  markInvalid = false,
  required = false,
  isMulti = false,
  ...props
}) => {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <div
      css={(theme: Theme) => ({
        marginBottom: markInvalid ? '2px' : '20px',
        width: '100%',
        '&:focus-within label': {
          color: theme.general.primaryColor,
        },
        ...wrapperCSS,
      })}
      data-uie-name={dataUieName}
    >
      {label && (
        <InputLabel htmlFor={id} markInvalid={markInvalid} isRequired={required}>
          {label}
        </InputLabel>
      )}

      <ReactSelect
        id={id}
        styles={customStyles(theme as Theme, markInvalid) as StylesConfig}
        components={{
          DropdownIndicator,
          Option: CustomOption(dataUieName),
          Menu: Menu(dataUieName),
          ValueContainer,
          IndicatorsContainer,
        }}
        hideSelectedOptions={false}
        isSearchable={false}
        isClearable={false}
        closeMenuOnSelect={!isMulti}
        isMulti={isMulti}
        options={options}
        {...props}
      />

      {!hasError && helperText && (
        <p css={(theme: Theme) => ({fontSize: '12px', fontWeight: 400, color: theme.Input.labelColor, marginTop: 8})}>
          {helperText}
        </p>
      )}

      {error}
    </div>
  );
};
