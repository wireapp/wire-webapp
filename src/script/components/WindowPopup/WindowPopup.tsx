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

import {calculatePopupPosition} from 'Util/DOM/calculatePopupPosition';

interface WindowPopupProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  onClose: () => void;
}

export const WindowPopup = ({children, onClose, width = 400, height = 250}: WindowPopupProps) => {
  const [newWindow, setNewWindow] = useState<Window | null>(null);

  useEffect(() => {
    const {top, left} = calculatePopupPosition(height, width);

    const newWindow = window.open(
      'about:blank',
      'popout',
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
  }, [onClose]);

  return !newWindow ? null : createPortal(children, newWindow.document.body);
};

const copyStyles = (source: Document, target: Document) => {
  source.head.querySelectorAll('link, style').forEach(htmlElement => {
    target.head.appendChild(htmlElement.cloneNode(true));
  });

  // [...source.styleSheets].forEach(styleSheet => {
  //   try {
  //     const cssRules = [...styleSheet.cssRules].map(rule => rule.cssText).join('');
  //     const style = document.createElement('style');

  //     style.textContent = cssRules;
  //     target.head.appendChild(style);
  //   } catch (e) {
  //     const link = document.createElement('link');

  //     link.rel = 'stylesheet';
  //     link.type = styleSheet.type;
  //     link.media = styleSheet.media;
  //     link.href = styleSheet.href;
  //     target.head.appendChild(link);
  //   }
  // });
};
