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
import {jsx} from '@emotion/core';
import {INPUT_CLASSNAME, InputProps, inputStyle} from './Input';

export type InputSubmitComboProps<T = HTMLDivElement> = InputProps<T>;

export const INPUT_SUBMIT_COMBO_CLASSNAME = 'inputSubmitCombo';

export const InputSubmitCombo = (props: InputSubmitComboProps) => (
  <div
    className={INPUT_SUBMIT_COMBO_CLASSNAME}
    css={theme => ({
      ...inputStyle(theme, props),
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
      paddingLeft: 0,
      [INPUT_CLASSNAME]: {
        flexGrow: 1,
        margin: '0 8px 0 0',
        padding: '0 0 0 16px',
      },
    })}
    {...props}
  />
);
