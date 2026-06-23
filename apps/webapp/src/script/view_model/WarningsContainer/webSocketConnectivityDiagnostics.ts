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

import {container} from 'tsyringe';

import {APIClient} from '../../service/apiClientSingleton';

type UnknownRecord = Record<string, unknown>;

type ClipboardWriter = {
  readonly writeText?: (text: string) => Promise<void>;
};

type DiagnosticsWindow = Window & {
  readonly wire?: {
    readonly app?: {
      readonly repository?: {
        readonly event?: {
          readonly notificationHandlingState?: () => unknown;
        };
      };
    };
  };
};

type DiagnosticsDocument = Pick<Document, 'hasFocus' | 'visibilityState'>;

type DiagnosticsNavigator = Pick<Navigator, 'onLine'> & {
  readonly clipboard?: ClipboardWriter;
};

export type WebSocketConnectivityDiagnosticsDependencies = {
  readonly apiClient?: unknown;
  readonly browserDocument?: DiagnosticsDocument;
  readonly browserNavigator?: DiagnosticsNavigator;
  readonly browserWindow?: DiagnosticsWindow;
  readonly currentTimestampMilliseconds?: () => number;
};

export type WebSocketConnectivityDiagnostics = {
  readonly timestamp: string;
  readonly appState: {
    readonly notificationHandlingState: unknown;
    readonly navigatorOnLine: boolean | undefined;
    readonly documentVisibilityState: DocumentVisibilityState | undefined;
    readonly documentHasFocus: boolean | undefined;
  };
  readonly webSocketClientState: {
    readonly useLegacySocket: unknown;
    readonly isLocked: boolean | undefined;
    readonly bufferedMessagesLength: number | undefined;
    readonly websocketState: number | undefined;
    readonly websocketStateName: string | undefined;
    readonly accessTokenRefreshInFlight: boolean;
  };
  readonly wireReconnectingWebsocketWrapperState: {
    readonly hasWrapper: boolean;
    readonly rawWebSocketState: number | undefined;
    readonly rawWebSocketStateName: string | undefined;
    readonly hasUnansweredPing: unknown;
    readonly lastMessageTimestamp: number | undefined;
    readonly millisecondsSinceLastMessage: number | undefined;
    readonly pingerActive: boolean;
    readonly pendingHealthChecksSize: number | undefined;
    readonly sleepHandlerActive: boolean;
    readonly reconnectAttemptCount: number | undefined;
    readonly reconnectSequenceRetryCount: number | undefined;
  };
  readonly underlyingReconnectingWebSocketState: {
    readonly hasUnderlyingSocket: boolean;
    readonly rwsReadyState: number | undefined;
    readonly rwsReadyStateName: string | undefined;
    readonly rwsConnectLock: unknown;
    readonly rwsShouldReconnect: unknown;
    readonly rwsCloseCalled: unknown;
    readonly rwsRetryCount: number | undefined;
  };
  readonly authState: {
    readonly hasValidAccessToken: boolean | undefined;
    readonly tokenExpirationTimestamp: number | undefined;
    readonly millisecondsUntilTokenExpiration: number | undefined;
    readonly hasMarkerToken: boolean;
  };
};

const webSocketReadyStateNames: Readonly<Record<number, string>> = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED',
};
const diagnosticsJsonIndentationSpaces = 2;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function toRecord(value: unknown): UnknownRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getArrayLength(value: unknown): number | undefined {
  return Array.isArray(value) ? value.length : undefined;
}

function getSetSize(value: unknown): number | undefined {
  return value instanceof Set ? value.size : undefined;
}

function getReadyStateName(readyState: number | undefined): string | undefined {
  return readyState === undefined ? undefined : webSocketReadyStateNames[readyState];
}

function callBooleanGetter(target: UnknownRecord | undefined, getterName: string): boolean | undefined {
  const getter = target?.[getterName];

  if (typeof getter !== 'function') {
    return undefined;
  }

  try {
    return Boolean(getter.call(target));
  } catch {
    return undefined;
  }
}

function callUnknownGetter(target: UnknownRecord | undefined, getterName: string): unknown {
  const getter = target?.[getterName];

  if (typeof getter !== 'function') {
    return undefined;
  }

  try {
    return getter.call(target);
  } catch {
    return undefined;
  }
}

function readNotificationHandlingState(browserWindow: DiagnosticsWindow | undefined): unknown {
  return callUnknownGetter(toRecord(browserWindow?.wire?.app?.repository?.event), 'notificationHandlingState');
}

function readDocumentHasFocus(browserDocument: DiagnosticsDocument | undefined): boolean | undefined {
  try {
    return browserDocument?.hasFocus();
  } catch {
    return undefined;
  }
}

function readDefaultApiClient(browserWindow: DiagnosticsWindow | undefined): unknown {
  if (!browserWindow?.wire?.app) {
    return undefined;
  }

  try {
    return container.resolve(APIClient);
  } catch {
    return undefined;
  }
}

function createDefaultDependencies(): WebSocketConnectivityDiagnosticsDependencies {
  const browserWindow = globalThis.window as DiagnosticsWindow | undefined;

  return {
    apiClient: readDefaultApiClient(browserWindow),
    browserDocument: globalThis.document,
    browserNavigator: globalThis.navigator,
    browserWindow,
    currentTimestampMilliseconds: Date.now,
  };
}

function isMaybeJust(value: unknown): boolean {
  return isRecord(value) && value.isJust === true;
}

export function collectWebSocketConnectivityDiagnostics(
  dependencies: WebSocketConnectivityDiagnosticsDependencies = createDefaultDependencies(),
): WebSocketConnectivityDiagnostics {
  const {
    apiClient,
    browserDocument,
    browserNavigator,
    browserWindow,
    currentTimestampMilliseconds = Date.now,
  } = dependencies;
  const currentTimestamp = currentTimestampMilliseconds();
  const apiClientRecord = toRecord(apiClient);
  const transport = toRecord(apiClientRecord?.transport);
  const webSocketClient = toRecord(transport?.ws);
  const httpClient = toRecord(transport?.http);
  const accessTokenStore = toRecord(httpClient?.accessTokenStore);
  const wrapper = toRecord(webSocketClient?.socket);
  const underlyingReconnectingWebSocket = toRecord(wrapper?.socket);
  const webSocketClientState = toNumber(webSocketClient?.websocketState);
  const rawWebSocketState = toNumber(callUnknownGetter(wrapper, 'getState'));
  const rwsReadyState = toNumber(underlyingReconnectingWebSocket?.readyState);
  const lastMessageTimestamp = toNumber(wrapper?.lastMessageTimestamp);
  const tokenExpirationTimestamp = toNumber(accessTokenStore?.tokenExpirationDate);

  return {
    timestamp: new Date(currentTimestamp).toISOString(),
    appState: {
      notificationHandlingState: readNotificationHandlingState(browserWindow),
      navigatorOnLine: browserNavigator?.onLine,
      documentVisibilityState: browserDocument?.visibilityState,
      documentHasFocus: readDocumentHasFocus(browserDocument),
    },
    webSocketClientState: {
      useLegacySocket: webSocketClient?.useLegacySocket,
      isLocked: callBooleanGetter(webSocketClient, 'isLocked'),
      bufferedMessagesLength: getArrayLength(webSocketClient?.bufferedMessages),
      websocketState: webSocketClientState,
      websocketStateName: getReadyStateName(webSocketClientState),
      accessTokenRefreshInFlight: webSocketClient?.accessTokenRefreshPromise !== undefined,
    },
    wireReconnectingWebsocketWrapperState: {
      hasWrapper: wrapper !== undefined,
      rawWebSocketState,
      rawWebSocketStateName: getReadyStateName(rawWebSocketState),
      hasUnansweredPing: wrapper?.hasUnansweredPing,
      lastMessageTimestamp,
      millisecondsSinceLastMessage:
        lastMessageTimestamp === undefined || lastMessageTimestamp === 0
          ? undefined
          : currentTimestamp - lastMessageTimestamp,
      pingerActive: wrapper?.pingerId !== undefined,
      pendingHealthChecksSize: getSetSize(wrapper?.pendingHealthChecks),
      sleepHandlerActive: isMaybeJust(wrapper?.stopBackFromSleepHandler),
      reconnectAttemptCount: toNumber(wrapper?.reconnectAttemptCount),
      reconnectSequenceRetryCount: toNumber(wrapper?.reconnectSequenceRetryCount),
    },
    underlyingReconnectingWebSocketState: {
      hasUnderlyingSocket: underlyingReconnectingWebSocket !== undefined,
      rwsReadyState,
      rwsReadyStateName: getReadyStateName(rwsReadyState),
      rwsConnectLock: underlyingReconnectingWebSocket?._connectLock,
      rwsShouldReconnect: underlyingReconnectingWebSocket?._shouldReconnect,
      rwsCloseCalled: underlyingReconnectingWebSocket?._closeCalled,
      rwsRetryCount: toNumber(underlyingReconnectingWebSocket?.retryCount),
    },
    authState: {
      hasValidAccessToken: callBooleanGetter(httpClient, 'hasValidAccessToken'),
      tokenExpirationTimestamp,
      millisecondsUntilTokenExpiration:
        tokenExpirationTimestamp === undefined ? undefined : tokenExpirationTimestamp - currentTimestamp,
      hasMarkerToken: typeof accessTokenStore?.markerToken === 'string' && accessTokenStore.markerToken.length > 0,
    },
  };
}

export async function copyWebSocketConnectivityDiagnostics(): Promise<void> {
  const diagnostics = collectWebSocketConnectivityDiagnostics();
  const serializedDiagnostics = JSON.stringify(diagnostics, null, diagnosticsJsonIndentationSpaces);

  console.info('WebSocket connectivity diagnostics', diagnostics);

  try {
    await navigator.clipboard.writeText(serializedDiagnostics);
  } catch (error) {
    console.warn('Failed to copy WebSocket connectivity diagnostics to clipboard', error);
    console.info(serializedDiagnostics);
  }
}
