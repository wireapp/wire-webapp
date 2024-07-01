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

import {useEffect, useMemo} from 'react';

import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import weakMemoize from '@emotion/weak-memoize';
import {createPortal} from 'react-dom';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {useActiveWindow} from 'src/script/hooks/useActiveWindow';
import {calculateChildWindowPosition} from 'Util/DOM/caculateChildWindowPosition';

import '../../../style/default.less';

interface DetachedWindowProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  onClose: () => void;
  name: string;
}

const memoizedCreateCacheWithContainer = weakMemoize((container: HTMLHeadElement) => {
  const newCache = createCache({container, key: 'detached-window'});
  return newCache;
});

export const DetachedWindow = ({children, name, onClose, width = 600, height = 600}: DetachedWindowProps) => {
  const newWindow = useMemo(() => {
    const {top, left} = calculateChildWindowPosition(height, width);

    return window.open(
      '',
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
  }, [height, name, width]);

  useActiveWindow(newWindow);

  useEffect(() => {
    if (!newWindow) {
      return () => {};
    }

    //New window is not opened on the same domain (it's about:blank), so we cannot use any of the dom loaded events to copy the styles.
    setTimeout(() => copyStyles(window.document, newWindow.document), 0);

    newWindow.document.title = window.document.title;

    newWindow.addEventListener('beforeunload', onClose);
    window.addEventListener('beforeunload', onClose);

    return () => {
      newWindow.close();
      newWindow.removeEventListener('beforeunload', onClose);
      window.removeEventListener('beforeunload', onClose);
    };
  }, [height, name, width, onClose, newWindow]);

  return !newWindow
    ? null
    : createPortal(
        <CacheProvider value={memoizedCreateCacheWithContainer(newWindow.document.head)}>
          <StyledApp id="detached-window" themeId={THEME_ID.DEFAULT} style={{height: '100%'}}>
            {children}
          </StyledApp>
        </CacheProvider>,
        newWindow.document.body,
      );
};

/**
 *  Copy styles from one document to another - link, style elements and body element class names.
 * @param source the source document object
 * @param target the target document object
 */
const copyStyles = (source: Document, target: Document) => {
  const targetHead = target.head;

  const elements = source.head.querySelectorAll('link, style');

  elements.forEach(htmlElement => {
    targetHead.insertBefore(htmlElement.cloneNode(true), targetHead.firstChild);
  });

  target.body.className = source.body.className;
  target.body.style.height = '100%';
};
