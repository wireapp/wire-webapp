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

import {components, MenuListProps} from 'react-select';

import {closeButtonStyles, headingContainerStyles} from './BaseSelectMenuList.styles';

import {CloseIcon} from '../../../Icon';
import {Theme} from '../../../Layout';

// eslint-disable-next-line react/display-name
export const BaseSelectMenuList = (menuListHeading: string, dataUieName: string) => (props: MenuListProps) => {
  const {selectProps, children} = props;

  const handleClose = () => {
    if (selectProps && selectProps.onMenuClose) {
      selectProps.onMenuClose();
    }
  };

  return (
    <components.MenuList {...props}>
      <div
        {...(dataUieName && {
          'data-uie-name': `menu-list-${dataUieName}`,
        })}
      >
        <div css={(theme: Theme) => headingContainerStyles(theme)}>
          {menuListHeading}
          <button onClick={handleClose} css={closeButtonStyles} aria-label={`Close: ${menuListHeading}`}>
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        {children}
      </div>
    </components.MenuList>
  );
};
BaseSelectMenuList.displayName = 'BaseSelectMenuList';
