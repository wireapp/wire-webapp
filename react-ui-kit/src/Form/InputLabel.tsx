/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC, ReactNode} from 'react';

import {COLOR_V2} from '../Identity';
import {Theme} from '../Layout';

export interface InputLabelProps {
  children: ReactNode | string;
  htmlFor?: string;
  markInvalid?: boolean;
  isRequired?: boolean;
}

const InputLabel: FC<InputLabelProps> = ({htmlFor, markInvalid, isRequired, children, ...props}) => (
  <label
    htmlFor={htmlFor}
    css={(theme: Theme) => ({
      fontSize: theme.fontSizes.medium,
      fontWeight: 400,
      lineHeight: '1rem',
      color: markInvalid ? COLOR_V2.RED_LIGHT_500 : theme.Input.labelColor,
    })}
    {...props}
  >
    {children}

    {isRequired && (
      <span
        css={(theme: Theme) => ({fontSize: theme.fontSizes.base, marginLeft: '4px', color: COLOR_V2.RED_LIGHT_500})}
      >
        *
      </span>
    )}
  </label>
);

export {InputLabel};
