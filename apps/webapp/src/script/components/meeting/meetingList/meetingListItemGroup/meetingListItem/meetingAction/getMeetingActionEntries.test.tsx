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

import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {getMeetingActionEntries} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/getMeetingActionEntries';
import {MEETING_ACTION_TRANSLATION_KEYS} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/meetingActionTranslationKeys';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

const futureNowMilliseconds = Date.parse('2026-06-15T13:00:00.000Z');
const ongoingNowMilliseconds = Date.parse('2026-06-15T14:30:00.000Z');
const pastNowMilliseconds = Date.parse('2026-06-15T16:00:00.000Z');

const createSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
  series_start_date: '2026-06-15T14:00:00.000Z',
  series_end_date: '2026-06-15T15:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'weekly',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
  ...overrides,
});

const createMeetingInstance = (overrides: Partial<MeetingSeries> = {}): MeetingInstance => {
  const meetingSeries = createSeries(overrides);

  return {
    meetingSeries,
    start: new Date(meetingSeries.series_start_date),
    end: new Date(meetingSeries.series_end_date),
  };
};

const createSelfUser = (id = 'host-id') => {
  const user = new User(id, 'example.com', translateForTest);
  user.name('Host');
  return user;
};

const translate = (key: string) => key;

const noop = () => undefined;

const getEditEntryLabel = (entries: ReturnType<typeof getMeetingActionEntries>) =>
  entries.find(entry => entry.label === MEETING_ACTION_TRANSLATION_KEYS.editMeeting);

const getDeleteForMeEntryLabel = (entries: ReturnType<typeof getMeetingActionEntries>) =>
  entries.find(entry => entry.label === MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForMe);

const getDeleteForAllEntryLabel = (entries: ReturnType<typeof getMeetingActionEntries>) =>
  entries.find(entry => entry.label === MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForAll);

const getJoinEntry = (entries: ReturnType<typeof getMeetingActionEntries>) =>
  entries.find(entry => entry.label === MEETING_ACTION_TRANSLATION_KEYS.joinNow);

const getEntryLabels = (entries: ReturnType<typeof getMeetingActionEntries>) => entries.map(entry => entry.label);

describe('getMeetingActionEntries', () => {
  it('returns the expected action labels without Start meeting', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      isJoinDisabled: false,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getEntryLabels(entries)).toEqual([
      MEETING_ACTION_TRANSLATION_KEYS.joinNow,
      MEETING_ACTION_TRANSLATION_KEYS.editMeeting,
      MEETING_ACTION_TRANSLATION_KEYS.deleteMeetingForAll,
    ]);
    expect(getEntryLabels(entries)).not.toContain('meetings.action.startMeeting');
  });

  it.each([futureNowMilliseconds, ongoingNowMilliseconds, pastNowMilliseconds])(
    'includes Join now for upcoming, ongoing, and completed meetings',
    nowMilliseconds => {
      const onJoin = jest.fn();
      const entries = getMeetingActionEntries({
        meetingInstance: createMeetingInstance(),
        selfUser: createSelfUser(),
        nowMilliseconds,
        translate,
        onJoin,
        isJoinDisabled: false,
        onEdit: noop,
        onDeleteForAll: noop,
        onDeleteForMe: noop,
      });

      const joinEntry = getJoinEntry(entries);
      expect(joinEntry).toBeDefined();
      expect(joinEntry?.isDisabled).toBe(false);
      joinEntry?.click?.();
      expect(onJoin).toHaveBeenCalledTimes(1);
    },
  );

  it('includes Edit meeting for an eligible host', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getEditEntryLabel(entries)).toBeDefined();
  });

  it('omits Edit meeting for a non-host invitee', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser('invitee-id'),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getEditEntryLabel(entries)).toBeUndefined();
  });

  it('includes Edit meeting when the instance is ongoing', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: ongoingNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getEditEntryLabel(entries)).toBeDefined();
  });

  it('omits Edit meeting when the instance is in the past', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: pastNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getEditEntryLabel(entries)).toBeUndefined();
  });

  it('includes Edit meeting for a recurring series whose anchor has started when the instance is upcoming', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: {
        meetingSeries: createSeries({
          series_start_date: '2026-06-01T10:00:00.000Z',
          series_end_date: '2026-06-01T11:00:00.000Z',
          recurrence: 'weekly',
        }),
        start: new Date('2026-06-22T10:00:00.000Z'),
        end: new Date('2026-06-22T11:00:00.000Z'),
      },
      selfUser: createSelfUser(),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getEditEntryLabel(entries)).toBeDefined();
  });

  it('includes Delete meeting for everyone for the host', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getDeleteForAllEntryLabel(entries)).toBeDefined();
    expect(getDeleteForMeEntryLabel(entries)).toBeUndefined();
  });

  it('includes Delete meeting for everyone when the instance has started', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: ongoingNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getDeleteForAllEntryLabel(entries)).toBeDefined();
    expect(getDeleteForMeEntryLabel(entries)).toBeUndefined();
  });

  it('includes Delete meeting for me for a participant', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser('invitee-id'),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getDeleteForMeEntryLabel(entries)).toBeDefined();
    expect(getDeleteForAllEntryLabel(entries)).toBeUndefined();
  });

  it('includes Delete meeting for me for a participant while the meeting is ongoing', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser('invitee-id'),
      nowMilliseconds: ongoingNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getDeleteForMeEntryLabel(entries)).toBeDefined();
    expect(getDeleteForAllEntryLabel(entries)).toBeUndefined();
  });

  it('includes Delete meeting for everyone when the instance is in the past', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: pastNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getDeleteForAllEntryLabel(entries)).toBeDefined();
    expect(getDeleteForMeEntryLabel(entries)).toBeUndefined();
    expect(getJoinEntry(entries)).toBeDefined();
  });

  it('includes Delete meeting for me for a participant when the instance is in the past', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser('invitee-id'),
      nowMilliseconds: pastNowMilliseconds,
      translate,
      onJoin: noop,
      onEdit: jest.fn(),
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    expect(getDeleteForMeEntryLabel(entries)).toBeDefined();
    expect(getDeleteForAllEntryLabel(entries)).toBeUndefined();
    expect(getJoinEntry(entries)).toBeDefined();
  });

  it('keeps Join now visible but disables it while joining or in a call', () => {
    const entries = getMeetingActionEntries({
      meetingInstance: createMeetingInstance(),
      selfUser: createSelfUser(),
      nowMilliseconds: futureNowMilliseconds,
      translate,
      onJoin: noop,
      isJoinDisabled: true,
      onEdit: noop,
      onDeleteForAll: noop,
      onDeleteForMe: noop,
    });

    const joinEntry = getJoinEntry(entries);
    expect(joinEntry).toBeDefined();
    expect(joinEntry?.isDisabled).toBe(true);
  });
});
