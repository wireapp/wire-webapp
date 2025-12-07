/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';

import {Runtime} from '@wireapp/commons';

interface DraggableClickWrapperProps {
  children: React.ReactElement;
  onClick: React.MouseEventHandler;
}

export const DraggableClickWrapper = ({onClick, children}: DraggableClickWrapperProps) => {
  const isMacDesktop = Runtime.isDesktopApp() && Runtime.isMacOS();
  if (!isMacDesktop) {
    return React.cloneElement(children, {onClick});
  }

  let isMoved = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  return React.cloneElement(children, {
    onMouseDown: ({screenX, screenY}: React.MouseEvent) => {
      isDragging = true;
      isMoved = false;
      startX = screenX;
      startY = screenY;
    },
    onMouseMove: ({screenX, screenY}: React.MouseEvent) => {
      if (isDragging && !isMoved) {
        const diffX = Math.abs(startX - screenX);
        const diffY = Math.abs(startY - screenY);
        if (diffX > 1 || diffY > 1) {
          isMoved = true;
        }
      }
    },
    onMouseUp: (event: React.MouseEvent) => {
      if (!isMoved) {
        onClick(event);
      }
      isDragging = false;
    },
  });
};
