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
import is from '@sindresorhus/is';

import {ButtonProps, ButtonVariant} from './Button';

import {COLOR, COLOR_V2, Theme} from '../../Identity';
import {defaultTransition} from '../../Identity/motions';
import {textStyle} from '../../Typography';

const getButtonTheme = (theme: Theme): NonNullable<Theme['Button']> => {
  if (is.undefined(theme.Button)) {
    throw new Error('Button theme tokens are not defined');
  }
  return theme.Button;
};

const buttonPrimaryStyles = <T>(theme: Theme, {backgroundColor, disabled, isActive}: ButtonProps<T>) => {
  const button = getButtonTheme(theme);
  const activeStyles = {
    backgroundColor: button.primaryActiveBg,
    border: `1px solid ${button.primaryActiveBorder}`,
    color: COLOR.WHITE,
  };

  return {
    ...(isActive === true
      ? activeStyles
      : {
          color: disabled === true ? button.primaryDisabledText : theme.general.contrastColor,
          backgroundColor:
            is.nonEmptyString(backgroundColor) || disabled === true ? button.primaryDisabledBg : button.primaryBg,
        }),

    ...(disabled !== true
      ? {
          '&:hover, &:focus': {
            backgroundColor: button.primaryHoverBg,
          },
          '&:focus': {
            border: `1px solid ${button.primaryFocusBorder}`,
          },
          '&:active': activeStyles,
        }
      : {}),
  };
};

const buttonSecondaryStyles = <T>(theme: Theme, {backgroundColor, disabled, isActive}: ButtonProps<T>) => {
  const button = getButtonTheme(theme);
  const activeStyles = {
    backgroundColor: button.secondaryActiveBg,
    border: `1px solid ${button.secondaryActiveBorder}`,
    color: theme.general.primaryColor,
  };

  return {
    border: `1px solid ${theme.IconButton.primaryBorderColor}`,

    ...(isActive === true
      ? activeStyles
      : {
          color: disabled === true ? theme.Input.placeholderColor : theme.general.color,
          backgroundColor:
            is.nonEmptyString(backgroundColor) || disabled === true
              ? theme.IconButton.primaryDisabledBgColor
              : theme.IconButton.primaryBgColor,
        }),

    ...(disabled !== true
      ? {
          '&:hover, &:focus': {
            border: `1px solid ${button.secondaryHoverBorder}`,
          },
          '&:focus': {
            color: theme.IconButton.primaryActiveFillColor,
          },
          '&:active': activeStyles,
        }
      : {}),
  };
};

const buttonTertiaryStyles = <T>(theme: Theme, {backgroundColor, disabled, isActive}: ButtonProps<T>) => {
  const button = getButtonTheme(theme);
  const activeStyles = {
    backgroundColor: button.tertiaryActiveBg,
    color: theme.IconButton.primaryActiveFillColor,
    '& > svg > path': {
      fill: theme.IconButton.primaryActiveFillColor,
    },
  };

  return {
    border: disabled === true ? `1px solid ${button.tertiaryDisabledBorder}` : `1px solid ${button.tertiaryBorder}`,
    borderRadius: '12px',
    fontSize: theme.fontSizes.medium,
    fontWeight: 700,
    lineHeight: '1.5rem',
    padding: '4px 8px',
    '& > svg > path': {
      fill: disabled === true ? theme.Input.placeholderColor : theme.general.color,
    },

    ...(isActive === true
      ? activeStyles
      : {
          color: disabled === true ? theme.Input.placeholderColor : theme.general.color,
          backgroundColor:
            is.nonEmptyString(backgroundColor) || disabled === true ? button.tertiarydisabledBg : button.tertiaryBg,
        }),

    ...(disabled !== true
      ? {
          '&:hover, &:focus': {
            backgroundColor: button.tertiaryHoverBg,
            border: `1px solid ${button.tertiaryHoverBorder}`,
          },
          '&:focus': {
            border: `1px solid ${theme.general.focusColor}`,
          },
          '&:active': activeStyles,
        }
      : {}),
  };
};

const buttonQuaternaryStyles = <T>({backgroundColor, disabled, isActive}: ButtonProps<T>) => {
  const activeStyles = {
    backgroundColor: COLOR_V2.GREEN_LIGHT_700,
  };

  return {
    lineHeight: '1.5rem',

    ...(isActive === true
      ? activeStyles
      : {
          color: disabled === true ? COLOR_V2.GRAY_80 : COLOR_V2.WHITE,
          backgroundColor: is.nonEmptyString(backgroundColor) || disabled === true ? COLOR_V2.GRAY_50 : COLOR_V2.GREEN,
        }),

    ...(disabled !== true
      ? {
          '&:hover, &:focus': {
            backgroundColor: COLOR_V2.GREEN_LIGHT_600,
          },
          '&:focus': {
            border: `1px solid ${COLOR_V2.GREEN_LIGHT_700}`,
          },
          '&:active': activeStyles,
        }
      : {}),
  };
};

const buttonCancelStyles = <T>({backgroundColor, disabled, isActive}: ButtonProps<T>) => {
  const activeStyles = {
    backgroundColor: COLOR_V2.RED_LIGHT_700,
  };

  return {
    lineHeight: '1.5rem',

    ...(isActive === true
      ? activeStyles
      : {
          color: disabled === true ? COLOR_V2.GRAY_80 : COLOR_V2.WHITE,
          backgroundColor: is.nonEmptyString(backgroundColor) || disabled === true ? COLOR_V2.GRAY_50 : COLOR_V2.RED,
        }),

    ...(disabled !== true
      ? {
          '&:hover, &:focus': {
            backgroundColor: COLOR_V2.RED_LIGHT_600,
          },
          '&:focus': {
            border: `1px solid ${COLOR_V2.RED_LIGHT_700}`,
          },
          '&:active': activeStyles,
        }
      : {}),
  };
};

const buttonSendStyles = <T>({backgroundColor, disabled, isActive}: ButtonProps<T>) => {
  const activeStyles = {
    backgroundColor: COLOR_V2.BLUE_LIGHT_700,
  };

  return {
    width: '40px',

    ...(isActive === true
      ? activeStyles
      : {
          backgroundColor: is.nonEmptyString(backgroundColor) || disabled === true ? COLOR_V2.GRAY_70 : COLOR_V2.BLUE,
        }),

    ...(disabled !== true
      ? {
          '&:hover, &:focus': {
            backgroundColor: COLOR_V2.BLUE_LIGHT_600,
          },
          '&:focus': {
            border: `1px solid ${COLOR_V2.BLUE_LIGHT_800}`,
          },
          '&:active': activeStyles,
        }
      : {}),
  };
};

export const buttonStyle: <T>(theme: Theme, props: ButtonProps<T>) => CSSObject = (
  theme,
  {
    variant = ButtonVariant.PRIMARY,
    block = false,
    noCapital = false,
    bold = true,
    center = true,
    color = COLOR.WHITE,
    fontSize = theme.fontSizes.base,
    noWrap = true,
    textTransform = 'none',
    truncate = true,
    group = false,
    ...props
  },
) => {
  return {
    ...textStyle(theme, {
      block,
      bold,
      center,
      fontSize,
      noWrap,
      textTransform,
      truncate,
      ...props,
    }),
    border: 0,
    cursor: props.disabled === true ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    padding: 0,
    outline: 'none',
    textDecoration: 'none',
    touchAction: 'manipulation',
    transition: defaultTransition,
    width: block ? '100%' : 'auto',
    '&:hover, &:focus': {
      textDecoration: 'none',
    },

    ...(variant !== ButtonVariant.TERTIARY && {
      borderRadius: variant === ButtonVariant.SEND ? '100%' : '16px',
      height: variant === ButtonVariant.SEND ? '40px' : '48px',
      lineHeight: variant === ButtonVariant.SEND ? '40px' : '48px',
      ...(variant !== ButtonVariant.SEND && {
        maxWidth: '100%',
        minWidth: '125px',
        padding: '0 16px',
      }),
    }),

    ...(variant === ButtonVariant.PRIMARY && buttonPrimaryStyles(theme, props)),
    ...(variant === ButtonVariant.SECONDARY && buttonSecondaryStyles(theme, props)),
    ...(variant === ButtonVariant.TERTIARY && buttonTertiaryStyles(theme, props)),
    ...(variant === ButtonVariant.QUATERNARY && buttonQuaternaryStyles(props)),
    ...(variant === ButtonVariant.CANCEL && buttonCancelStyles(props)),
    ...(variant === ButtonVariant.SEND && buttonSendStyles(props)),

    ...(group === true
      ? {
          borderRadius: '0',

          '&:first-of-type': {
            borderRadius: '12px 0 0 12px',
          },
          '&:last-of-type': {
            borderRadius: '0 12px 12px 0',
          },
        }
      : {}),
  };
};
