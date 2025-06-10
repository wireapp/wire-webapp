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

import {Theme} from '../../../Identity';
import {inputStyle} from '../../Input';

export interface BaseSelectStylesParams {
  theme: Theme;
  markInvalid?: boolean;
  menuPosition?: 'absolute' | 'relative';
  controlCSS?: CSSObject;
  containerCSS?: CSSObject;
}

export const baseIndicatorSeparatorStyles = (): CSSObject => ({
  display: 'none',
});

export const baseContainerStyles = (containerCSS: CSSObject): CSSObject => ({
  '& > div': {
    height: 'auto',
    minHeight: '48px',
    '&:-moz-focusring': {
      color: 'transparent',
      textShadow: '0 0 0 #000',
    },
    position: 'relative',
    ...containerCSS,
  },
});

export const baseControlStyles = ({
  theme,
  isDisabled,
  markInvalid,
  selectProps,
  controlCSS,
}: {
  theme: Theme;
  isDisabled: boolean;
  markInvalid: boolean;
  selectProps: {
    isDisabled: boolean;
    menuIsOpen: boolean;
  };
  controlCSS: CSSObject;
}): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  appearance: 'none',
  padding: '0 8px 0 16px',
  height: 'auto',
  minHeight: '48px',
  ...inputStyle(theme, {disabled: selectProps.isDisabled, markInvalid}),
  borderRadius: 12,
  ...(isDisabled && {
    backgroundColor: theme.Input.backgroundColorDisabled,
    color: theme.Select.disabledColor,
    cursor: 'default',
  }),
  ...(markInvalid && {
    boxShadow: `0 0 0 1px ${theme.general.dangerColor}`,
  }),
  ...(selectProps.menuIsOpen && {
    boxShadow: `0 0 0 1px ${theme.general.primaryColor}`,
    '&:hover': {
      boxShadow: `0 0 0 1px ${theme.general.primaryColor}`,
    },
  }),
  cursor: !selectProps.isDisabled && 'pointer',
  '&:focus:visible, active': {
    boxShadow: !selectProps.isDisabled && `0 0 0 1px ${theme.general.primaryColor}`,
  },
  ...controlCSS,
});

export const baseDropdownIndicatorStyles = ({
  theme,
  selectProps,
}: {
  theme: Theme;
  selectProps: {
    isDisabled: boolean;
  };
}): CSSObject => {
  const isSelectDisabled = selectProps.isDisabled;
  return {
    '& > svg': {
      fill: isSelectDisabled && theme.Input.placeholderColor,
    },
  };
};

export const baseMenuStyles = ({
  theme,
  menuPosition,
}: {
  theme: Theme;
  menuPosition: 'absolute' | 'relative';
}): CSSObject => ({
  boxShadow: `0 0 0 1px ${theme.general.primaryColor}, 0 4px 11px hsl(0deg 0% 0% / 10%)`,
  borderRadius: 12,
  marginBottom: 0,
  marginTop: 4,
  overflowY: 'auto',
  position: menuPosition,
});

export const baseMenuListStyles = (): CSSObject => ({
  borderRadius: 0,
  paddingBottom: 0,
  paddingTop: 0,
  maxHeight: 400,
});

export const baseOptionStyles = ({
  theme,
  isDisabled,
  isFocused,
  isSelected,
  isMulti,
}: {
  theme: Theme;
  isDisabled: boolean;
  isFocused: boolean;
  isSelected: boolean;
  isMulti: boolean;
}): CSSObject => ({
  backgroundColor: theme.Input.backgroundColor,
  color: theme.general.color,
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  fontSize: theme.fontSizes.base,
  lineHeight: '1.5rem',
  ...(isSelected &&
    !isDisabled &&
    !isMulti && {
      background: theme.general.primaryColor,
      borderColor: theme.general.primaryColor,
      color: theme.Select.contrastTextColor,
      '&:hover': {
        backgroundColor: theme.Select.selectedActiveBg,
      },
      '&:active': {
        backgroundColor: theme.general.primaryColor,
        boxShadow: `inset 0 0 0 1px ${theme.Select.selectedActiveBg}`,
        color: theme.general.contrastColor,
      },
    }),
  ...(isFocused &&
    !isDisabled &&
    !isSelected && {
      backgroundColor: theme.Select.optionHoverBg,
      borderColor: theme.Select.optionHoverBg,
      color: theme.general.color,
      '&:active': {
        background: theme.Select.optionHoverBg,
        boxShadow: `inset 0 0 0 1px ${theme.Select.selectedActiveBg}`,
        color: theme.general.color,
      },
    }),
  ...(isMulti &&
    isSelected && {
      backgroundColor: theme.Input.backgroundColor,
      '&:hover': {
        backgroundColor: theme.Select.optionHoverBg,
      },
      '&:active': {
        background: theme.Select.optionHoverBg,
        boxShadow: `inset 0 0 0 1px ${theme.Select.selectedActiveBg}`,
        color: theme.general.color,
      },
    }),
  ...(isDisabled && {
    backgroundColor: theme.Input.backgroundColorDisabled,
    color: theme.Select.disabledColor,
    '&:hover, &:active, &:focus': {
      backgroundColor: theme.Select.borderColor,
      color: theme.Select.disabledColor,
    },
    ...(isFocused && {
      backgroundColor: theme.Select.borderColor,
      color: theme.Select.disabledColor,
    }),
  }),
});

export const baseSingleValueStyles = ({
  theme,
  selectProps,
}: {
  theme: Theme;
  selectProps: {
    isDisabled: boolean;
  };
}): CSSObject => {
  const isSelectDisabled = selectProps.isDisabled;
  return {
    color: isSelectDisabled ? theme.Input.placeholderColor : theme.general.color,
  };
};
