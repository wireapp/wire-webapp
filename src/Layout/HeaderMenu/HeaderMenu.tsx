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

import {useState} from 'react';
import * as React from 'react';

import {MenuContent} from './MenuContent';
import {MenuItems} from './MenuItems';
import {MenuOpenButton} from './MenuOpenButton';
import {MenuScrollableItems} from './MenuScrollableItems';

export interface HeaderMenuProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  centerElement?: React.ReactNode;
  logoElement?: React.ReactNode;
}

export const HeaderMenu = ({children, logoElement = null, centerElement = null, ...props}: HeaderMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      setIsOpen(current => !current);
    }
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <div css={{height: '64px'}} {...props} data-uie-name="element-header-menu">
      <MenuContent open={isOpen}>
        <div css={{alignSelf: 'center', display: 'flex', zIndex: 2}} onClick={closeMenu}>
          {logoElement}
        </div>
        <div css={{alignSelf: 'center', display: 'flex'}}>{centerElement}</div>
        <MenuOpenButton
          onClick={toggleMenu}
          open={isOpen}
          style={{justifySelf: 'end', position: isOpen ? 'fixed' : undefined, right: '16px', top: '21px'}}
          data-uie-name="do-toggle-header-menu"
        />
        <MenuItems onClick={closeMenu} open={isOpen}>
          <MenuScrollableItems>{children}</MenuScrollableItems>
        </MenuItems>
      </MenuContent>
    </div>
  );
};
