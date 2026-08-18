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

import {Children, ReactNode} from 'react';

import {components, GroupBase, ValueContainerProps} from 'react-select';

import {Option} from '../Select';

export const SelectValueContainer = <
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({
  children,
  ...restProps
}: ValueContainerProps<Option, IsMulti, Group>) => {
  const childArray = Children.toArray(children);

  return (
    <components.ValueContainer {...restProps}>
      {renderValue(childArray[0])} {childArray[1]}
    </components.ValueContainer>
  );
};

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
