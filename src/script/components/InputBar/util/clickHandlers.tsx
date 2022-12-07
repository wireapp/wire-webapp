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

import {HTMLProps, ReactNode} from 'react';

interface IgnoreClickWrapperProps extends HTMLProps<HTMLDivElement> {
  children: ReactNode;
}
const IgnoreClickWrapper = ({children, ...rest}: IgnoreClickWrapperProps) => {
  return (
    <div {...rest} data-ignore-click>
      {children}
    </div>
  );
};

const handleClickOutsideOfInputBar = (event: Event, callback: () => void): void => {
  const ignoredParent = (event.target as HTMLElement).closest('div[data-ignore-click]') !== null;

  if (!ignoredParent) {
    callback();
  }
};

export {handleClickOutsideOfInputBar, IgnoreClickWrapper};
