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

import {ReactElement} from 'react';

import {CSSObject, useTheme} from '@emotion/react';
import ReactSelect, {GroupBase, StylesConfig} from 'react-select';
import type {StateManagerProps} from 'react-select/dist/declarations/src/stateManager';

import {BaseSelectDropdownIndicator} from './BaseSelect/BaseSelectDropdownIndicator';
import {customStyles} from './Select.styles';
import {SelectContainer} from './SelectContainer/SelectContainer';
import {SelectIndicatorsContainer} from './SelectIndicatorsContainer/SelectIndicatorsContainer';
import {SelectMenu} from './SelectMenu/SelectMenu';
import {SelectMenuList} from './SelectMenuList/SelectMenuList';
import {isGroup, SelectOption} from './SelectOption/SelectOption';
import {SelectValueContainer} from './SelectValueContainer/SelectValueContainer';

import {Theme} from '../../Identity/Theme';
import {TabIndex} from '../../utils/enums';
import {InputLabel} from '../InputLabel';

export type Option = {
  value: string | number;
  label: string;
  description?: string;
  isDisabled?: boolean;
};

export interface SelectProps<IsMulti extends boolean, Group extends GroupBase<Option>>
  extends StateManagerProps<Option, IsMulti, Group> {
  id: string;
  disabled?: boolean;
  dataUieName: string;
  options: Option[] | Group[];
  menuCSS?: CSSObject;
  wrapperCSS?: CSSObject;
  selectControlCSS?: CSSObject;
  selectContainerCSS?: CSSObject;
  label?: string;
  helperText?: string;
  error?: ReactElement;
  markInvalid?: boolean;
  required?: boolean;
  isMulti?: IsMulti;
  isSearchable?: boolean;
  overlayMenu?: boolean;
  menuListHeading?: string;
}

export const Select = <IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({
  id,
  label,
  error,
  helperText,
  disabled = false,
  dataUieName,
  options,
  isMulti,
  wrapperCSS = {},
  menuCSS = {},
  selectControlCSS = {},
  selectContainerCSS = {},
  markInvalid = false,
  required = false,
  isSearchable = false,
  overlayMenu = true,
  menuListHeading,
  ...props
}: SelectProps<IsMulti, Group>) => {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={isGroup(options)}
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
        styles={
          customStyles({
            theme: theme as Theme,
            markInvalid,
            menuPosition: overlayMenu ? 'absolute' : 'relative',
            controlCSS: selectControlCSS,
            containerCSS: selectContainerCSS,
          }) as StylesConfig
        }
        components={{
          SelectContainer: SelectContainer,
          DropdownIndicator: BaseSelectDropdownIndicator,
          Option: SelectOption(dataUieName),
          Menu: SelectMenu(dataUieName, menuCSS),
          ValueContainer: SelectValueContainer,
          IndicatorsContainer: SelectIndicatorsContainer,
          ...(menuListHeading && {MenuList: SelectMenuList(menuListHeading, dataUieName)}),
        }}
        tabIndex={TabIndex.UNFOCUSABLE}
        isDisabled={disabled}
        hideSelectedOptions={false}
        isSearchable={isSearchable}
        isClearable={false}
        closeMenuOnSelect={!isMulti}
        isMulti={isMulti}
        options={options}
        {...props}
      />

      {!hasError && helperText && (
        <p
          css={(theme: Theme) => ({
            fontSize: theme.fontSizes.small,
            fontWeight: 400,
            color: theme.Input.labelColor,
            marginTop: 8,
          })}
        >
          {helperText}
        </p>
      )}

      {error}
    </div>
  );
};
