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

import {ReactNode} from 'react';

import {components, ValueContainerProps} from 'react-select';

import {Option} from '../Select';

export const BaseSelectValueContainer = ({children, ...restProps}: ValueContainerProps<Option>) => (
  <components.ValueContainer {...restProps}>
    {renderValue(children[0])} {children[1]}
  </components.ValueContainer>
);

const renderValue = (value: ReactNode) => {
  if (Array.isArray(value)) {
    const currentValue = (i: number) => value[i].props.children;

    return (
      <div
        css={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          paddingRight: 14,
          gridArea: '1/1/2/3',
        }}
      >
        {currentValue(0)}
      </div>
    );
  }

  return value;
};
