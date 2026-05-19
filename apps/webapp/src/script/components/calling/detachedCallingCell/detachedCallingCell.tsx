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

import {container} from 'tsyringe';

import {FireAndForgetInvoker} from '@wireapp/core';

import {Call} from 'Repositories/calling/call';
import {CallingRepository} from 'Repositories/calling/callingRepository';
import {CallingViewMode, CallState, DesktopScreenShareMenu} from 'Repositories/calling/callState';
import {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {UserState} from 'Repositories/user/userState';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {DetachedWindow} from './components/detachedWindow';

import {CallingContainer} from '../callingOverlayContainer';
import {WindowContextProvider} from '../useWindow';

interface DetachedCallingCellProps {
  propertiesRepository: PropertiesRepository;
  callingRepository: CallingRepository;
  fireAndForgetInvoker: FireAndForgetInvoker;
  toggleScreenshare: (call: Call, desktopScreenShareMenu: DesktopScreenShareMenu) => void;
  callState?: CallState;
  userState?: UserState;
}

export const DetachedCallingCell = ({
  propertiesRepository,
  callingRepository,
  fireAndForgetInvoker,
  toggleScreenshare,
  callState = container.resolve(CallState),
  userState = container.resolve(UserState),
}: DetachedCallingCellProps) => {
  const {
    joinedCall: activeCall,
    viewMode,
    detachedWindow,
  } = useKoSubscribableChildren(callState, ['joinedCall', 'viewMode', 'detachedWindow']);
  useKoSubscribableChildren(userState, ['self']);

  const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;

  if (activeCall == null || !isDetachedWindow) {
    return null;
  }

  return (
    <DetachedWindow callState={callState}>
      <WindowContextProvider value={detachedWindow ?? window}>
        <CallingContainer
          propertiesRepository={propertiesRepository}
          callingRepository={callingRepository}
          fireAndForgetInvoker={fireAndForgetInvoker}
          toggleScreenshare={toggleScreenshare}
        />
      </WindowContextProvider>
    </DetachedWindow>
  );
};
