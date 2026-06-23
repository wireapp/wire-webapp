/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';

import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {WarningsContainer} from './WarningsContainer';
import {
  collectWebSocketConnectivityDiagnostics,
  WebSocketConnectivityDiagnosticsDependencies,
} from './webSocketConnectivityDiagnostics';
import {useWarningsState} from './WarningsState';

import {Warnings} from '.';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('WarningsContainer', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    useWarningsState.setState({name: '', warnings: []});
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useWarningsState.setState({name: '', warnings: []});
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
    jest.restoreAllMocks();
  });

  it('does not render when no warning is in the queue', async () => {
    const {container} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});

    expect(container.firstChild).toBeFalsy();
  });

  it('correctly renders warning of type request_camera', async () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_CAMERA);
    });
    const WarningElement = getByTestId('request-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_camera', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_CAMERA);
    });
    const WarningElement = getByTestId('denied-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_MICROPHONE);
    });
    const WarningElement = getByTestId('request-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_MICROPHONE);
    });
    const WarningElement = getByTestId('denied-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_screen', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_SCREEN);
    });
    const WarningElement = getByTestId('request-screen');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type denied_screen', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.DENIED_SCREEN);
    });
    const WarningElement = getByTestId('denied-screen');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type not_found_camera', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NOT_FOUND_CAMERA);
    });
    const WarningElement = getByTestId('not-found-camera');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type not_found_microphone', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NOT_FOUND_MICROPHONE);
    });
    const WarningElement = getByTestId('not-found-microphone');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type request_notification', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.REQUEST_NOTIFICATION);
    });
    const WarningElement = getByTestId('request-notification');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type unsupported_incoming_call', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.UNSUPPORTED_INCOMING_CALL);
    });
    const WarningElement = getByTestId('unsupported-incoming-call');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type unsupported_outgoing_call', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.UNSUPPORTED_OUTGOING_CALL);
    });
    const WarningElement = getByTestId('unsupported-outgoing-call');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type connectivity_reconnect', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });
    const WarningElement = getByTestId('connectivity-reconnect');
    expect(WarningElement).toBeTruthy();
  });

  it('does not render websocket connectivity diagnostics button by default', () => {
    const {queryByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });

    expect(queryByTestId('do-copy-websocket-connectivity-diagnostics')).toBeNull();
  });

  it('does not render websocket connectivity diagnostics button when disabled', () => {
    const {queryByTestId} = render(
      <WarningsContainer onRefresh={jest.fn()} isWebSocketConnectivityDiagnosticsEnabled={false} />,
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });

    expect(queryByTestId('do-copy-websocket-connectivity-diagnostics')).toBeNull();
  });

  it('renders websocket connectivity diagnostics button for connectivity_reconnect when enabled', () => {
    const {getByTestId} = render(
      <WarningsContainer onRefresh={jest.fn()} isWebSocketConnectivityDiagnosticsEnabled />,
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });

    expect(getByTestId('do-copy-websocket-connectivity-diagnostics')).toBeTruthy();
  });

  it('does not render websocket connectivity diagnostics button for no_internet when enabled', () => {
    const {queryByTestId} = render(
      <WarningsContainer onRefresh={jest.fn()} isWebSocketConnectivityDiagnosticsEnabled />,
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
    });

    expect(queryByTestId('do-copy-websocket-connectivity-diagnostics')).toBeNull();
  });

  it('copies websocket connectivity diagnostics JSON to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(console, 'info').mockImplementation(jest.fn());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText},
    });

    const {getByTestId} = render(
      <WarningsContainer onRefresh={jest.fn()} isWebSocketConnectivityDiagnosticsEnabled />,
      {wrapper: rootProviderWrapper},
    );
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
    });

    fireEvent.click(getByTestId('do-copy-websocket-connectivity-diagnostics'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const [serializedDiagnostics] = writeText.mock.calls[0];
    expect(() => JSON.parse(serializedDiagnostics)).not.toThrow();
    expect(serializedDiagnostics).not.toContain('access_token');
  });

  it('does not include raw token values in websocket connectivity diagnostics', () => {
    const diagnosticsDependencies: WebSocketConnectivityDiagnosticsDependencies = {
      apiClient: {
        transport: {
          http: {
            accessTokenStore: {
              accessTokenData: {
                access_token: 'secret-access-token',
              },
              markerToken: 'secret-marker-token',
              tokenExpirationDate: 1_234,
            },
            hasValidAccessToken: () => true,
          },
          ws: {
            accessTokenRefreshPromise: Promise.resolve(),
            bufferedMessages: ['buffered-message'],
            isLocked: () => true,
            socket: {
              getState: () => 1,
              hasUnansweredPing: true,
              lastMessageTimestamp: 1_000,
              pendingHealthChecks: new Set([jest.fn()]),
              reconnectAttemptCount: 2,
              reconnectSequenceRetryCount: 1,
              socket: {
                _closeCalled: false,
                _connectLock: true,
                _shouldReconnect: true,
                readyState: 3,
                retryCount: 4,
                url: 'wss://example.invalid/events?access_token=secret-access-token',
              },
              stopBackFromSleepHandler: {isJust: true},
            },
            useLegacySocket: false,
            websocketState: 0,
          },
        },
      },
      browserDocument: {
        hasFocus: () => true,
        visibilityState: 'visible',
      },
      browserNavigator: {
        onLine: true,
      },
      browserWindow: {
        wire: {
          app: {
            repository: {
              event: {
                notificationHandlingState: () => 'WEB_SOCKET',
              },
            },
          },
        },
      } as Window,
      currentTimestampMilliseconds: () => 2_000,
    };

    const diagnostics = collectWebSocketConnectivityDiagnostics(diagnosticsDependencies);
    const serializedDiagnostics = JSON.stringify(diagnostics);

    expect(diagnostics.webSocketClientState.websocketStateName).toBe('CONNECTING');
    expect(diagnostics.wireReconnectingWebsocketWrapperState.rawWebSocketStateName).toBe('OPEN');
    expect(diagnostics.underlyingReconnectingWebSocketState.rwsReadyStateName).toBe('CLOSED');
    expect(serializedDiagnostics).not.toContain('secret-access-token');
    expect(serializedDiagnostics).not.toContain('secret-marker-token');
    expect(serializedDiagnostics).not.toContain('access_token');
    expect(serializedDiagnostics).not.toContain('wss://example.invalid');
  });

  it('collects websocket connectivity diagnostics when window.wire is missing', () => {
    const diagnostics = collectWebSocketConnectivityDiagnostics({
      browserDocument: document,
      browserNavigator: navigator,
      browserWindow: window,
      currentTimestampMilliseconds: () => 2_000,
    });

    expect(diagnostics.appState.notificationHandlingState).toBeUndefined();
    expect(diagnostics.wireReconnectingWebsocketWrapperState.hasWrapper).toBe(false);
    expect(diagnostics.underlyingReconnectingWebSocketState.hasUnderlyingSocket).toBe(false);
  });

  it('correctly renders warning of type call_quality_poor', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CALL_QUALITY_POOR);
    });
    const WarningElement = getByTestId('call-quality-poor');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type connectivity_recovery', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
    });
    const WarningElement = getByTestId('connectivity-recovery');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type no_internet', () => {
    const {getByTestId} = render(<WarningsContainer onRefresh={jest.fn()} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
    });
    const WarningElement = getByTestId('no-internet');
    expect(WarningElement).toBeTruthy();
  });

  it('correctly renders warning of type lifecycle_update', () => {
    const refresh = jest.fn();
    const {getByTestId} = render(<WarningsContainer onRefresh={refresh} />, {wrapper: rootProviderWrapper});
    act(() => {
      Warnings.showWarning(Warnings.TYPE.LIFECYCLE_UPDATE);
    });
    const WarningElement = getByTestId('lifecycle-update');
    expect(WarningElement).toBeTruthy();
    fireEvent.click(getByTestId('do-update'));
    expect(refresh).toHaveBeenCalled();
  });
});
