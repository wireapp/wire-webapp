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

import type {FunctionComponent} from 'react';

import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import weakMemoize from '@emotion/weak-memoize';
import {isNull} from '@sindresorhus/is';
import {createPortal} from 'react-dom';
import {container} from 'tsyringe';

import '../../../../../../style/default.less';
import {useActiveWindow} from '../../../../../hooks/useActiveWindow';
import {CallState} from '../../../../../repositories/calling/CallState';
import {THEME_ID} from '../../../../../uiKit/identity/theme/theme';
import {StyledApp} from '../../../../../uiKit/layout/styledApp/styledApp';
import {useKoSubscribableChildren} from '../../../../../util/componentUtil';

interface DetachedWindowProps {
  children: React.ReactNode;
  callState?: CallState;
}

const memoizedCreateCacheWithContainer = weakMemoize((container: HTMLHeadElement) => {
  const newCache = createCache({container, key: 'detached-window'});
  return newCache;
});

export const DetachedWindow: FunctionComponent<DetachedWindowProps> = ({
  children,
  callState = container.resolve(CallState),
}: DetachedWindowProps) => {
  const {detachedWindow} = useKoSubscribableChildren(callState, ['detachedWindow']);

  useActiveWindow(detachedWindow);

  if (isNull(detachedWindow)) {
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
