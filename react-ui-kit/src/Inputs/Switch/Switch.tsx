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

import {inputStyles, labelStyles, loadingStyles, switchDotStyles, switchStyles, wrapperStyles} from './Switch.styles';

import {Loading} from '../../DataDisplay';
import {COLOR} from '../../Identity';
import {InputProps} from '../Input';

export interface SwitchProps<T = HTMLInputElement> extends InputProps<T> {
  activatedColor?: string;
  checked: boolean;
  deactivatedColor?: string;
  disabled?: boolean;
  disabledColor?: string;
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
      activatedColor = COLOR.BLUE,
      deactivatedColor = '#d2d2d2',
      name,
      dataUieName,
    },
    ref,
  ) => (
    <div css={wrapperStyles}>
      <input
        ref={ref}
        id={id}
        checked={checked}
        disabled={disabled}
        name={name}
        onChange={event => onToggle(event.target.checked)}
        onKeyDown={event => {
          if (event.key == 'Enter') {
            onToggle(!(event.target as HTMLInputElement).checked);
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
            activatedColor,
            deactivatedColor,
          })}
        />
        {showLoading ? (
          <Loading size={21} color={loadingColor} css={loadingStyles} />
        ) : (
          <span css={switchDotStyles(disabled, checked)} />
        )}
      </label>
    </div>
  ),
);

Switch.displayName = 'Switch';
