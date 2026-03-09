/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {FunctionComponent, ReactNode} from 'react';

import {render, screen} from '@testing-library/react';

import {createDeterministicWallClock} from '../../clock/deterministicWallClock';
import {StartupFeatureToggleName} from '../../featureToggles/startupFeatureToggles';
import {RootProvider} from '../../page/RootProvider';
import {MainViewModel} from '../../view_model/MainViewModel';
import {createNoopManagedWebSocketConnection} from '../../webSocketConnection/createNoopManagedWebSocketConnection';
import {webSocketConnectionState} from '../../webSocketConnection/webSocketConnectionState';

import {WebSocketConnectionStateDebugInfo} from './WebSocketConnectionStateDebugInfo';

type TestWrapperProperties = {
  readonly children: ReactNode;
  readonly isReliableWebSocketConnectionEnabled: boolean;
};

const testMainViewModel = {} as MainViewModel;

const TestWrapper: FunctionComponent<TestWrapperProperties> = ({
  children,
  isReliableWebSocketConnectionEnabled,
}: TestWrapperProperties) => {
  const managedWebSocketConnection = createNoopManagedWebSocketConnection();
  const deterministicWallClock = createDeterministicWallClock();

  function isFeatureToggleEnabled(featureName: StartupFeatureToggleName): boolean {
    return featureName === 'reliable-websocket-connection' && isReliableWebSocketConnectionEnabled;
  }

  return (
    <RootProvider
      value={{
        mainViewModel: testMainViewModel,
        managedWebSocketConnection,
        webSocketConnectionState: webSocketConnectionState.offline,
        wallClock: deterministicWallClock,
        doesApplicationNeedForceReload: false,
        isFeatureToggleEnabled,
      }}
    >
      {children}
    </RootProvider>
  );
};

describe('WebSocketConnectionStateDebugInfo', () => {
  it('renders the current WebSocket connection state when reliable WebSocket feature is enabled', () => {
    render(
      <TestWrapper isReliableWebSocketConnectionEnabled={true}>
        <WebSocketConnectionStateDebugInfo />
      </TestWrapper>,
    );

    expect(screen.getByText('WEBSOCKET CONNECTION STATE')).not.toBeNull();
    expect(screen.getByText(webSocketConnectionState.offline)).not.toBeNull();
  });

  it('does not render when reliable WebSocket feature is disabled', () => {
    render(
      <TestWrapper isReliableWebSocketConnectionEnabled={false}>
        <WebSocketConnectionStateDebugInfo />
      </TestWrapper>,
    );

    expect(screen.queryByText('WEBSOCKET CONNECTION STATE')).toBeNull();
    expect(screen.queryByText(webSocketConnectionState.offline)).toBeNull();
  });
});
