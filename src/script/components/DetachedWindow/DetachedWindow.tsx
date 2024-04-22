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

import {calculateChildWindowPosition} from 'Util/DOM/caculateChildWindowPosition';

import '../../../style/default.less';

interface DetachedWindowProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  onClose: () => void;
  url?: string;
  name: string;
}

export const DetachedWindow = ({children, url = '', name, onClose, width = 600, height = 600}: DetachedWindowProps) => {
  const [newWindow, setNewWindow] = useState<Window | null>(null);

  useEffect(() => {
    const {top, left} = calculateChildWindowPosition(height, width);

    const newWindow = window.open(
      url,
      name,
      `
        width=${width}
        height=${height},
        top=${top},
        left=${left}
        location=no,
        menubar=no,
        resizable=no,
        status=no,
        toolbar=no,
      `,
    );

    if (!newWindow) {
      return () => {};
    }

    copyStyles(document, newWindow.document);
    newWindow.document.title = window.document.title;
    newWindow.document.body.className = window.document.body.className;

    newWindow.addEventListener('beforeunload', onClose);
    window.addEventListener('beforeunload', onClose);

    setNewWindow(newWindow);

    return () => {
      newWindow.close();
      newWindow.removeEventListener('beforeunload', onClose);
      window.removeEventListener('beforeunload', onClose);
    };
  }, [height, name, url, width, onClose]);

  return !newWindow
    ? null
    : createPortal(
        <StyledApp id="detached-window" themeId={THEME_ID.DEFAULT} style={{height: '100%'}}>
          {children}
        </StyledApp>,
        newWindow.document.body,
      );
};

const copyStyles = (source: Document, target: Document) => {
  source.head.querySelectorAll('link, style').forEach(htmlElement => {
    target.head.appendChild(htmlElement.cloneNode(true));
  });
};
