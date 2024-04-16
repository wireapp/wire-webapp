/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {createPortal} from 'react-dom';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

interface WindowPopupProps {
  children: React.ReactNode;
  onClose: () => void;
}

export const WindowPopup = ({children, onClose}: WindowPopupProps) => {
  const [newWindow, setNewWindow] = useState<Window | null>(null);

  useEffect(() => {
    const newWindow = window.open(
      '',
      'newWin',
      `width=400,height=300,left=${window.screen.availWidth / 2 - 200},top=${window.screen.availHeight / 2 - 150},resizable=0,scrollbars=no,toolbar=no,menubar=no,location=no,directories=no,status=no`,
    );

    if (!newWindow) {
      return;
    }

    window.document.head.querySelectorAll('link, style').forEach(htmlElement => {
      newWindow.document.head.appendChild(htmlElement.cloneNode(true));
    });

    newWindow.onbeforeunload = onClose;
    setNewWindow(newWindow);

    return () => {
      newWindow.close();
    };
  }, [onClose]);

  return !newWindow
    ? null
    : createPortal(
        <StyledApp themeId={THEME_ID.DEFAULT} css={{backgroundColor: 'green', height: '100%'}}>
          {children}
        </StyledApp>,
        newWindow.document.body,
      );
};
