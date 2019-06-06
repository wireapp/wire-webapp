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
import {useState} from 'react';
import {MenuContent} from './MenuContent';
import {MenuItems} from './MenuItems';
import {MenuOpenButton} from './MenuOpenButton';
import {MenuScrollableItems} from './MenuScrollableItems';

export interface HeaderMenuProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  logoElement?: React.ReactNode;
}

export const HeaderMenu = ({children, logoElement = null, ...props}: HeaderMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      setIsOpen(current => !current);
    }
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <div style={{height: '64px'}} {...props} data-uie-name="element-header-menu">
      <MenuContent open={isOpen}>
        <div style={{zIndex: 2}} onClick={closeMenu}>
          {logoElement}
        </div>
        <MenuItems onClick={closeMenu} open={isOpen}>
          <MenuScrollableItems>{children}</MenuScrollableItems>
        </MenuItems>
        <MenuOpenButton onClick={toggleMenu} open={isOpen} data-uie-name="do-toggle-header-menu" />
      </MenuContent>
    </div>
  );
};
