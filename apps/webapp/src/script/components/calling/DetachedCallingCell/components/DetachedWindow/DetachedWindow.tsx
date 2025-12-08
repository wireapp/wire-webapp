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

import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import weakMemoize from '@emotion/weak-memoize';
import {createPortal} from 'react-dom';
import {container} from 'tsyringe';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {CallState} from 'Repositories/calling/CallState';
import {useActiveWindow} from 'src/script/hooks/useActiveWindow';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import '../../../../../../style/default.less';

interface DetachedWindowProps {
  children: React.ReactNode;
  callState?: CallState;
}

const memoizedCreateCacheWithContainer = weakMemoize((container: HTMLHeadElement) => {
  const newCache = createCache({container, key: 'detached-window'});
  return newCache;
});

export const DetachedWindow = ({children, callState = container.resolve(CallState)}: DetachedWindowProps) => {
  const {detachedWindow} = useKoSubscribableChildren(callState, ['detachedWindow']);

  useActiveWindow(detachedWindow);

  if (!detachedWindow) {
    return null;
  }

  return (
    <>
      {createPortal(
        <CacheProvider value={memoizedCreateCacheWithContainer(detachedWindow.document.head)}>
          <StyledApp id="detached-window" themeId={THEME_ID.DEFAULT} style={{height: '100%'}}>
            {children}
            <div id="app-notification"></div>
          </StyledApp>
        </CacheProvider>,
        detachedWindow.document.body,
      )}
    </>
  );
};
