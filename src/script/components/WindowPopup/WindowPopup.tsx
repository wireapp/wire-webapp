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

import {calculateChildWindowPosition} from 'Util/DOM/caculateChildWindowPosition';

interface DetachedWindowProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  onClose: () => void;
  url?: string;
  name: string;
}

export const DetachedWindow = ({children, url = '', name, onClose, width = 400, height = 250}: DetachedWindowProps) => {
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
      return;
    }

    copyStyles(document, newWindow.document);

    newWindow.onbeforeunload = onClose;
    setNewWindow(newWindow);

    return () => {
      newWindow.close();
    };
  }, [height, name, url, width, onClose]);

  return !newWindow ? null : createPortal(children, newWindow.document.body);
};

const copyStyles = (source: Document, target: Document) => {
  source.head.querySelectorAll('link, style').forEach(htmlElement => {
    target.head.appendChild(htmlElement.cloneNode(true));
  });
};
