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

import {CSSObject} from '@emotion/react';
import is from '@sindresorhus/is';
import {components, GroupBase, MenuProps} from 'react-select';

import {Option} from '../Select';

export const SelectMenu = <IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>(
  dataUieName: string,
  css?: CSSObject,
) => {
  function SelectMenuComponent(props: MenuProps<Option, IsMulti, Group>) {
    const {children} = props;

    return (
      <components.Menu {...props} css={css}>
        <div
          {...(is.nonEmptyString(dataUieName) && {
            'data-uie-name': `dropdown-${dataUieName}`,
          })}
        >
          {children}
        </div>
      </components.Menu>
    );
  }
  SelectMenuComponent.displayName = 'SelectMenu';
  return SelectMenuComponent;
};
