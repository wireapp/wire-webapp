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

import {act, render} from '@testing-library/react';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {getLogger} from 'Util/logger';
import {translateForTest} from 'Util/test/translateForTest';

import {ContentState, useAppState} from '../useAppState';
import {WindowTitleUpdater} from './windowTitleUpdater';

jest.mock('amplify');
jest.mock('tsyringe', () => {
  const actualTsyringeModule = jest.requireActual('tsyringe');

  return {
    ...actualTsyringeModule,
    container: {
      resolve: jest.fn(),
    },
  };
});
jest.mock('Util/componentUtil');
jest.mock('Util/logger', () => {
  return {
    getLogger: jest.fn(() => {
      return {debug: jest.fn()};
    }),
  };
});

const mockWindowTitleLoggerDebug = (getLogger as jest.Mock).mock.results[0].value.debug as jest.Mock;
jest.mock('../../Config', () => {
  return {
    Config: {
      getConfig: jest.fn(() => {
        return {BRAND_NAME: 'Wire'};
      }),
    },
  };
});
jest.mock('../useAppState', () => {
  const actualUseAppStateModule = jest.requireActual('../useAppState');

  return {
    ...actualUseAppStateModule,
    useAppState: jest.fn(),
  };
});

describe('WindowTitleUpdater', () => {
  const activeNotificationStateHandlers = new Set<(notificationState: NOTIFICATION_HANDLING_STATE) => void>();
  const setUnreadMessagesCount = jest.fn();
  let connectionRequests: unknown[];
  let unreadConversations: unknown[];

  const renderWindowTitleUpdater = () => {
    return render(<WindowTitleUpdater translate={translateForTest} />);
  };

  const latestNotificationStateHandler = (): ((notificationState: NOTIFICATION_HANDLING_STATE) => void) => {
    const subscribeCalls = (amplify.subscribe as jest.Mock).mock.calls;
    const latestSubscribeCall = subscribeCalls.at(-1);

    return latestSubscribeCall[1];
  };

  const publishNotificationState = (notificationState: NOTIFICATION_HANDLING_STATE) => {
    act(() => {
      activeNotificationStateHandlers.forEach(notificationStateHandler => {
        notificationStateHandler(notificationState);
      });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    activeNotificationStateHandlers.clear();
    connectionRequests = [];
    unreadConversations = [];

    (amplify.subscribe as jest.Mock).mockImplementation(
      (_eventName: string, notificationStateHandler: (notificationState: NOTIFICATION_HANDLING_STATE) => void) => {
        activeNotificationStateHandlers.add(notificationStateHandler);
      },
    );
    (amplify.unsubscribe as jest.Mock).mockImplementation(
      (_eventName: string, notificationStateHandler: (notificationState: NOTIFICATION_HANDLING_STATE) => void) => {
        activeNotificationStateHandlers.delete(notificationStateHandler);
      },
    );
    (useAppState as jest.Mock).mockImplementation(selector => {
      return selector({contentState: ContentState.CONVERSATION, setUnreadMessagesCount});
    });
    (useKoSubscribableChildren as jest.Mock).mockImplementation((_state: unknown, properties: string[]) => {
      if (properties.includes('connectRequests')) {
        return {connectRequests: connectionRequests};
      }

      return {activeConversation: undefined, unreadConversations};
    });
  });

  it('keeps one active subscription across rerenders and uses the same handler to unsubscribe', () => {
    const {rerender, unmount} = renderWindowTitleUpdater();
    const firstNotificationStateHandler = latestNotificationStateHandler();

    rerender(<WindowTitleUpdater translate={translateForTest} />);

    expect(activeNotificationStateHandlers).toEqual(new Set([firstNotificationStateHandler]));

    publishNotificationState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

    expect(mockWindowTitleLoggerDebug).not.toHaveBeenCalled();

    unmount();

    expect(amplify.unsubscribe).toHaveBeenLastCalledWith(
      WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE,
      firstNotificationStateHandler,
    );
  });

  it('does not transition state or log again when an event resolves to the current state', () => {
    renderWindowTitleUpdater();

    publishNotificationState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

    expect(mockWindowTitleLoggerDebug).not.toHaveBeenCalled();
    expect(amplify.subscribe).toHaveBeenCalledTimes(1);
  });

  it('disables title updates and logs the state being applied', () => {
    renderWindowTitleUpdater();

    publishNotificationState(NOTIFICATION_HANDLING_STATE.STREAM);

    expect(mockWindowTitleLoggerDebug).toHaveBeenCalledWith("Set window title update state to 'false'");
    expect(activeNotificationStateHandlers).toEqual(new Set([latestNotificationStateHandler()]));
  });

  it('does not update the title while disabled and updates it again when websocket handling resumes', () => {
    const {rerender} = renderWindowTitleUpdater();
    const titleBeforeDisablingUpdates = document.title;

    expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.UNREAD_COUNT, 0);

    publishNotificationState(NOTIFICATION_HANDLING_STATE.STREAM);
    connectionRequests = [{}];
    unreadConversations = [{}];
    rerender(<WindowTitleUpdater translate={translateForTest} />);

    expect(amplify.publish).toHaveBeenCalledTimes(1);
    expect(document.title).toBe(titleBeforeDisablingUpdates);

    publishNotificationState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

    expect(amplify.publish).toHaveBeenLastCalledWith(WebAppEvents.LIFECYCLE.UNREAD_COUNT, 2);
    expect(document.title).toBe('(2) Wire');
  });

  it('does not invoke stale handlers after a state transition and rerender', () => {
    const {rerender} = renderWindowTitleUpdater();

    publishNotificationState(NOTIFICATION_HANDLING_STATE.STREAM);
    rerender(<WindowTitleUpdater translate={translateForTest} />);
    publishNotificationState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

    expect(mockWindowTitleLoggerDebug).toHaveBeenCalledTimes(2);
    expect(mockWindowTitleLoggerDebug).toHaveBeenLastCalledWith("Set window title update state to 'true'");
  });
});
