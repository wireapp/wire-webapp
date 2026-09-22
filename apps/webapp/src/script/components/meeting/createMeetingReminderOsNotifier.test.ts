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

import {result} from 'true-myth';

import type {MeetingReminderFirePayload} from 'Components/meeting/createMeetingReminderScheduler';
import type {Translate} from 'Util/localizerUtil';

import {
  systemNotificationErrors,
  type SystemNotificationApi,
  type SystemNotificationRequest,
} from 'src/script/notification/systemNotificationTypes';

import {createMeetingReminderOsNotifier, toMeetingReminderNotificationTag} from './createMeetingReminderOsNotifier';

const createPayload = (overrides: Partial<MeetingReminderFirePayload> = {}): MeetingReminderFirePayload => ({
  qualifiedId: {id: 'meeting-id', domain: 'example.com'},
  qualifiedConversationId: {id: 'conversation-id', domain: 'example.com'},
  meetingTitle: 'Weekly sync',
  meetingStartTime: '2026-06-01T10:00:00.000Z',
  qualifiedCreator: {id: 'creator-id', domain: 'example.com'},
  ...overrides,
});

const translate = ((identifier: string, substitutions?: Record<string, string>) =>
  identifier === 'meetings.notifications.startsAt'
    ? `Starts at ${substitutions?.time}`
    : identifier) as Translate;

const formatMeetingTime = (meetingStartTime: string): string =>
  meetingStartTime === '2026-06-01T10:00:00.000Z' ? '12:00 PM' : meetingStartTime;

const createHarness = (apiOverrides: Partial<SystemNotificationApi> = {}) => {
  const requests: SystemNotificationRequest[] = [];
  const closedTags: string[] = [];
  const logger = {info: jest.fn(), warn: jest.fn()};
  const openMeetingsList = jest.fn();

  const notifier = createMeetingReminderOsNotifier({
    notificationApi: {
      isSupported: () => true,
      getPermission: () => 'granted',
      show: request => {
        requests.push(request);

        return result.ok({
          close: () => {
            closedTags.push(request.tag);
            return result.ok(undefined);
          },
        });
      },
      ...apiOverrides,
    },
    openMeetingsList,
    formatMeetingTime,
    translate,
    logger,
  });

  return {requests, closedTags, logger, openMeetingsList, notifier};
};

describe('createMeetingReminderOsNotifier', () => {
  it('presents a notification naming the meeting and its start time', () => {
    const {requests, notifier} = createHarness();

    notifier.notify(createPayload());

    expect(requests).toHaveLength(1);
    expect(requests[0].title).toBe('Weekly sync');
    expect(requests[0].body).toBe('Starts at 12:00 PM');
  });

  it('attaches neither action buttons nor a Wire sound file', () => {
    const {requests, notifier} = createHarness();

    notifier.notify(createPayload());

    expect(Object.keys(requests[0]).sort()).toEqual(['body', 'onClick', 'tag', 'title']);
  });

  it('focuses the meetings list and closes the toast when clicked', () => {
    const {requests, closedTags, openMeetingsList, notifier} = createHarness();

    notifier.notify(createPayload());
    requests[0].onClick();

    expect(openMeetingsList).toHaveBeenCalledTimes(1);
    expect(closedTags).toEqual([requests[0].tag]);
  });

  it('tags the toast per meeting occurrence so a recurring meeting does not stack toasts', () => {
    const firstOccurrence = createPayload();
    const secondOccurrence = createPayload({meetingStartTime: '2026-06-08T10:00:00.000Z'});

    expect(toMeetingReminderNotificationTag(firstOccurrence)).not.toBe(
      toMeetingReminderNotificationTag(secondOccurrence),
    );
    expect(toMeetingReminderNotificationTag(firstOccurrence)).toBe(toMeetingReminderNotificationTag(createPayload()));
  });

  it.each(['denied', 'default'] as const)('presents nothing when permission is %s', permission => {
    const {requests, logger, notifier} = createHarness({getPermission: () => permission});

    notifier.notify(createPayload());

    expect(requests).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('presents nothing when notifications are unsupported', () => {
    const {requests, logger, notifier} = createHarness({isSupported: () => false});

    notifier.notify(createPayload());

    expect(requests).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and drops a failure to present the toast', () => {
    const {logger, notifier} = createHarness({
      show: () => result.err(systemNotificationErrors.presentationFailed),
    });

    notifier.notify(createPayload());

    expect(logger.warn).toHaveBeenCalledWith('failed to present meeting reminder OS notification', {
      error: systemNotificationErrors.presentationFailed,
      tag: toMeetingReminderNotificationTag(createPayload()),
    });
  });

  it('logs a failure to close the toast', () => {
    const requests: SystemNotificationRequest[] = [];
    const {logger, notifier} = createHarness({
      show: request => {
        requests.push(request);

        return result.ok({
          close: () => result.err(systemNotificationErrors.closeFailed),
        });
      },
    });

    notifier.notify(createPayload());
    requests[0].onClick();

    expect(logger.warn).toHaveBeenCalledWith('failed to close meeting reminder OS notification', {
      error: systemNotificationErrors.closeFailed,
      tag: requests[0].tag,
    });
  });

  it('closes outstanding toasts on teardown, once', () => {
    const {closedTags, notifier} = createHarness();

    notifier.notify(createPayload());
    notifier.notify(createPayload({meetingStartTime: '2026-06-08T10:00:00.000Z'}));
    notifier.stop();
    notifier.stop();

    expect(closedTags).toEqual([
      toMeetingReminderNotificationTag(createPayload()),
      toMeetingReminderNotificationTag(createPayload({meetingStartTime: '2026-06-08T10:00:00.000Z'})),
    ]);
  });

  it('does not close a clicked toast again on teardown', () => {
    const {requests, closedTags, notifier} = createHarness();

    notifier.notify(createPayload());
    requests[0].onClick();
    notifier.stop();

    expect(closedTags).toHaveLength(1);
  });
});
