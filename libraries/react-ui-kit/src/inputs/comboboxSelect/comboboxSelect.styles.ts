/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';
import {StylesConfig} from 'react-select';

import type {ComboboxSelectOption} from './comboboxSelect';

import {Theme} from '../../identity/theme';
import {visuallyHidden} from '../../utils';
import {
  baseContainerStyles,
  baseControlStyles,
  baseDropdownIndicatorStyles,
  baseIndicatorSeparatorStyles,
  baseMenuListStyles,
  baseMenuStyles,
  baseOptionStyles,
  baseSingleValueStyles,
} from '../select/baseSelect/baseSelect.styles';

interface SelectStylesParams {
  theme: Theme;
  markInvalid?: boolean;
  menuPosition?: 'absolute' | 'relative';
  controlCSS?: CSSObject;
  containerCSS?: CSSObject;
  menuListCSS?: CSSObject;
}

export const wrapperStyles: CSSObject = {
  marginBottom: '20px',
  width: '100%',
  position: 'relative',
  '& .select__menu': {
    position: 'absolute',
  },
};

export const selectStyles = ({
  theme,
  markInvalid = false,
  controlCSS = {},
  containerCSS = {},
  menuListCSS = {},
}: SelectStylesParams): StylesConfig<ComboboxSelectOption, true> => {
  return {
    indicatorSeparator: () => {
      return baseIndicatorSeparatorStyles();
    },
    indicatorsContainer: provided => {
      return provided;
    },
    container: provided => {
      return {
        ...provided,
        ...baseContainerStyles(containerCSS),
      };
    },
    control: (providedControlStyles, {isDisabled, selectProps}) => {
      return baseControlStyles({theme, isDisabled, markInvalid, selectProps, controlCSS});
    },
    dropdownIndicator: (provided, selectProps) => {
      return {
        ...provided,
        ...baseDropdownIndicatorStyles({theme, selectProps}),
      };
    },
    menuList: provided => {
      return {
        ...provided,
        ...baseMenuListStyles(),
        ...menuListCSS,
      };
    },
    option: (provided, {isDisabled, isFocused, isSelected, isMulti}) => {
      return {
        ...provided,
        ...baseOptionStyles({theme, isDisabled, isFocused, isSelected, isMulti}),
        padding: '10px 16px',
        fontWeight: 400,
        '&:not(:last-of-type)': {
          borderBottom: `1px solid ${theme.Select.borderColor}`,
        },
        '&:first-of-type': {
          borderRadius: '0',
        },
        '&:last-of-type': {
          borderRadius: '0',
        },
      };
    },
    singleValue: (provided, selectProps) => {
      return {
        ...provided,
        ...baseSingleValueStyles({theme, selectProps}),
      };
    },
    menu: provided => {
      return {
        ...provided,
        ...baseMenuStyles({theme, menuPosition: 'absolute'}),
        width: '100%',
        zIndex: 'var(--z-index-modal)',
        position: 'absolute',
      };
    },
    menuPortal: provided => {
      return {
        ...provided,
        zIndex: 'var(--z-index-modal)',
      };
    },
    multiValue: provided => {
      return {
        ...provided,
        backgroundColor: theme.Select.optionHoverBg,
        borderRadius: 8,
        margin: 4,
        fontSize: '14px',
        height: '24px',
      };
    },
    multiValueLabel: provided => {
      return {
        ...provided,
        color: theme.general.primaryColor,
        fontWeight: 500,
        padding: '0 8px 0 0',
      };
    },
    multiValueRemove: provided => {
      return {
        ...provided,
        color: theme.general.primaryColor,
        paddingLeft: 2,
        paddingRight: 6,
        ':hover': {
          backgroundColor: 'transparent',
          color: theme.general.primaryColor,
        },

        '& svg': {
          fill: 'currentColor',
        },
      };
    },
    valueContainer: provided => {
      return {
        ...provided,
        padding: 0,
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        maxHeight: '72px',
        overflowY: 'auto',
      };
    },
  };
};

export const noOptionsMessageStyles = {
  padding: '8px 12px',
};

export const loadingMessageStyles = {
  padding: '8px 12px',
};

export const labelCSS = ({isVisuallyHidden}: {isVisuallyHidden: boolean}) => {
  return isVisuallyHidden ? visuallyHidden() : {};
};
