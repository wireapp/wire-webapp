/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {forwardRef} from 'react';

import {useTheme} from '@emotion/react';

import {inputStyles, labelStyles, loadingStyles, switchDotStyles, switchStyles, wrapperStyles} from './Switch.styles';

import {Loading} from '../../DataDisplay';
import {COLOR, THEME_ID, Theme} from '../../Identity';
import {InputProps} from '../Input';

export interface SwitchProps<T = HTMLInputElement> extends InputProps<T> {
  activatedColor?: string;
  activatedColorDark?: string;
  checked: boolean;
  deactivatedColor?: string;
  deactivatedColorDark?: string;
  disabled?: boolean;
  disabledColor?: string;
  disabledColorDark?: string;
  id?: string;
  loadingColor?: string;
  name?: string;
  onToggle: (isChecked: boolean) => void;
  showLoading?: boolean;
  dataUieName?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      id = Math.random().toString(),
      checked,
      onToggle = () => {},
      showLoading,
      disabled,
      loadingColor = COLOR.BLUE,
      activatedColor,
      activatedColorDark,
      deactivatedColor,
      deactivatedColorDark,
      disabledColor,
      disabledColorDark,
      name,
      dataUieName,
    },
    ref,
  ) => {
    const theme = useTheme() as Theme;
    const isDarkTheme = theme?.themeId === THEME_ID.DARK;
    const switchTheme = theme?.Switch;

    const resolvedActivatedColor =
      (isDarkTheme ? activatedColorDark ?? activatedColor : activatedColor) ??
      switchTheme?.activatedColor ??
      COLOR.BLUE;
    const resolvedDeactivatedColor =
      (isDarkTheme ? deactivatedColorDark ?? deactivatedColor : deactivatedColor) ??
      switchTheme?.deactivatedColor ??
      '#d2d2d2';
    const resolvedDisabledColor =
      (isDarkTheme ? disabledColorDark ?? disabledColor : disabledColor) ?? switchTheme?.disabledColor;
    const isInteractionDisabled = Boolean(disabled || showLoading);
    const handleToggle = (nextChecked: boolean) => {
      if (isInteractionDisabled) {
        return;
      }
      onToggle(nextChecked);
    };

    return (
      <div css={wrapperStyles}>
        <input
          ref={ref}
          id={id}
          checked={checked}
          disabled={isInteractionDisabled}
          name={name}
          onChange={event => handleToggle(event.target.checked)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleToggle(!(event.target as HTMLInputElement).checked);
            }
          }}
          type="checkbox"
          css={inputStyles}
          data-uie-name={dataUieName}
        />
        <label htmlFor={id} css={labelStyles(disabled, showLoading)}>
          <span
            css={switchStyles({
              disabled,
              showLoading,
              checked,
              activatedColor: resolvedActivatedColor,
              deactivatedColor: resolvedDeactivatedColor,
              disabledColor: resolvedDisabledColor,
            })}
          />
          {showLoading ? (
            <Loading size={21} color={loadingColor} css={loadingStyles} />
          ) : (
            <span css={switchDotStyles(disabled, checked)} />
          )}
        </label>
      </div>
    );
  },
);

Switch.displayName = 'Switch';
