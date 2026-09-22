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

import type {QualifiedId} from '@wireapp/api-client/lib/user/';

import {createFactory} from '@enormora/objectory';
import {result} from 'true-myth';

import type {MeetingReminderFirePayload} from 'Components/meeting/createMeetingReminderScheduler';
import type {Translate} from 'Util/localizerUtil';

import {
  systemNotificationErrorKinds,
  type SystemNotificationApi,
  type SystemNotificationRequest,
} from 'src/script/notification/systemNotificationTypes';

import {createMeetingReminderOsNotifier, toMeetingReminderNotificationTag} from './createMeetingReminderOsNotifier';

const qualifiedIdFactory = createFactory<QualifiedId>(() => {
  return {id: 'meeting-id', domain: 'example.com'};
});

const meetingReminderFirePayloadFactory = createFactory<MeetingReminderFirePayload>(() => {
  return {
    qualifiedId: qualifiedIdFactory,
    qualifiedConversationId: qualifiedIdFactory.withOverrides({id: 'conversation-id'}),
    meetingTitle: 'Weekly sync',
    meetingStartTime: '2026-06-01T10:00:00.000Z',
    qualifiedCreator: qualifiedIdFactory.withOverrides({id: 'creator-id'}),
  };
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

    notifier.notify(meetingReminderFirePayloadFactory.build());

    expect(requests).toHaveLength(1);
    expect(requests[0].title).toBe('Weekly sync');
    expect(requests[0].body).toBe('Starts at 12:00 PM');
  });

  it('attaches neither action buttons nor a Wire sound file', () => {
    const {requests, notifier} = createHarness();

    notifier.notify(meetingReminderFirePayloadFactory.build());

    expect(Object.keys(requests[0]).sort()).toEqual(['body', 'onClick', 'onClose', 'tag', 'title']);
  });

  it('focuses the meetings list and closes the toast when clicked', () => {
    const {requests, closedTags, openMeetingsList, notifier} = createHarness();

    notifier.notify(meetingReminderFirePayloadFactory.build());
    requests[0].onClick();

    expect(openMeetingsList).toHaveBeenCalledTimes(1);
    expect(closedTags).toEqual([requests[0].tag]);
  });

  it('tags the toast per meeting occurrence so a recurring meeting does not stack toasts', () => {
    const firstOccurrence = meetingReminderFirePayloadFactory.build();
    const secondOccurrence = meetingReminderFirePayloadFactory.build({meetingStartTime: '2026-06-08T10:00:00.000Z'});

    expect(toMeetingReminderNotificationTag(firstOccurrence)).not.toBe(
      toMeetingReminderNotificationTag(secondOccurrence),
    );
    expect(toMeetingReminderNotificationTag(firstOccurrence)).toBe(toMeetingReminderNotificationTag(meetingReminderFirePayloadFactory.build()));
  });

  it.each(['denied', 'default'] as const)('presents nothing when permission is %s', permission => {
    const {requests, logger, notifier} = createHarness({getPermission: () => permission});

    notifier.notify(meetingReminderFirePayloadFactory.build());

    expect(requests).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('presents nothing when notifications are unsupported', () => {
    const {requests, logger, notifier} = createHarness({isSupported: () => false});

    notifier.notify(meetingReminderFirePayloadFactory.build());

    expect(requests).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and drops a failure to present the toast', () => {
    const {logger, notifier} = createHarness({
      show: () =>
        result.err({
          kind: systemNotificationErrorKinds.presentationFailed,
          cause: new Error('notification could not be constructed'),
        }),
    });

    notifier.notify(meetingReminderFirePayloadFactory.build());

    expect(logger.warn).toHaveBeenCalledWith('failed to present meeting reminder OS notification', {
      error: systemNotificationErrorKinds.presentationFailed,
      cause: new Error('notification could not be constructed'),
      tag: toMeetingReminderNotificationTag(meetingReminderFirePayloadFactory.build()),
    });
  });

  it('logs a failure to close the toast', () => {
    const requests: SystemNotificationRequest[] = [];
    const {logger, notifier} = createHarness({
      show: request => {
        requests.push(request);

        return result.ok({
          close: () =>
            result.err({
              kind: systemNotificationErrorKinds.closeFailed,
              cause: new Error('notification could not be closed'),
            }),
        });
      },
    });

    notifier.notify(meetingReminderFirePayloadFactory.build());
    requests[0].onClick();

    expect(logger.warn).toHaveBeenCalledWith('failed to close meeting reminder OS notification', {
      error: systemNotificationErrorKinds.closeFailed,
      cause: new Error('notification could not be closed'),
      tag: requests[0].tag,
    });
  });

  it('forgets a toast the platform closed on its own, so teardown does not close it again', () => {
    const {requests, closedTags, notifier} = createHarness();

    notifier.notify(meetingReminderFirePayloadFactory.build());
    requests[0].onClose();
    notifier.stop();

    expect(closedTags).toEqual([]);
  });

  it('closes outstanding toasts on teardown, once', () => {
    const {closedTags, notifier} = createHarness();

    notifier.notify(meetingReminderFirePayloadFactory.build());
    notifier.notify(meetingReminderFirePayloadFactory.build({meetingStartTime: '2026-06-08T10:00:00.000Z'}));
    notifier.stop();
    notifier.stop();

    expect(closedTags).toEqual([
      toMeetingReminderNotificationTag(meetingReminderFirePayloadFactory.build()),
      toMeetingReminderNotificationTag(meetingReminderFirePayloadFactory.build({meetingStartTime: '2026-06-08T10:00:00.000Z'})),
    ]);
  });

  it('does not close a clicked toast again on teardown', () => {
    const {requests, closedTags, notifier} = createHarness();

    notifier.notify(meetingReminderFirePayloadFactory.build());
    requests[0].onClick();
    notifier.stop();

    expect(closedTags).toHaveLength(1);
  });
});
