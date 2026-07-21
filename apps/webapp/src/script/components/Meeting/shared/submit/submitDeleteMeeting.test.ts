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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {task} from 'true-myth';

import {meetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {
  deleteMeetingSubmitResults,
  resetInFlightDeleteMeetingsForTest,
  submitDeleteMeeting,
} from './submitDeleteMeeting';

const meetingId = {id: 'meeting-id', domain: 'example.com'};

const createSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
  series_start_date: '2026-06-15T14:00:00.000Z',
  series_end_date: '2026-06-15T15:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'weekly',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: meetingId,
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

const futureWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: Date.parse('2026-06-15T13:00:00.000Z'),
});

const pastWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: Date.parse('2026-06-15T16:00:00.000Z'),
});

describe('submitDeleteMeeting', () => {
  let primaryModalShow: jest.Mock;

  beforeEach(() => {
    resetInFlightDeleteMeetingsForTest();
    primaryModalShow = jest.fn();
    jest.spyOn(PrimaryModal, 'show').mockImplementation(primaryModalShow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetInFlightDeleteMeetingsForTest();
  });

  const createSubmitDeps = (
    overrides: {
      deleteMeetingForAll?: jest.Mock;
      deleteMeetingForMe?: jest.Mock;
      removeMeetingByQualifiedId?: jest.Mock;
      loadMeetings?: jest.Mock;
      wallClock?: typeof futureWallClock;
      selfUser?: User | undefined;
    } = {},
  ) => ({
    meetingInstance: createMeetingInstance(),
    mode: 'forAll' as const,
    selfUser: 'selfUser' in overrides ? overrides.selfUser : createSelfUser(),
    wallClock: overrides.wallClock ?? futureWallClock,
    translate: translateForTest,
    deleteMeetingForMe:
      overrides.deleteMeetingForMe ?? jest.fn().mockReturnValue(task.resolve(undefined)),
    deleteMeetingForAll:
      overrides.deleteMeetingForAll ?? jest.fn().mockReturnValue(task.resolve(undefined)),
    removeMeetingByQualifiedId: overrides.removeMeetingByQualifiedId ?? jest.fn(),
    loadMeetings: overrides.loadMeetings ?? jest.fn().mockResolvedValue(undefined),
  });

  it('removes the meeting from the store after a successful delete for all', async () => {
    const removeMeetingByQualifiedId = jest.fn();
    const deleteMeetingForAll = jest.fn().mockReturnValue(task.resolve(undefined));

    const result = await submitDeleteMeeting(
      createSubmitDeps({
        deleteMeetingForAll,
        removeMeetingByQualifiedId,
      }),
    );

    expect(result).toBe(deleteMeetingSubmitResults.succeeded);
    expect(deleteMeetingForAll).toHaveBeenCalledTimes(1);
    expect(removeMeetingByQualifiedId).toHaveBeenCalledWith(meetingId);
    expect(primaryModalShow).not.toHaveBeenCalled();
  });

  it('removes the meeting and shows cleanup error when delete succeeded but local cleanup failed', async () => {
    const removeMeetingByQualifiedId = jest.fn();
    const deleteMeetingForAll = jest
      .fn()
      .mockReturnValue(task.reject(meetingSubmitErrors.deleteSucceededButLocalCleanupFailed));
    const loadMeetings = jest.fn().mockResolvedValue(undefined);

    const result = await submitDeleteMeeting(
      createSubmitDeps({
        deleteMeetingForAll,
        removeMeetingByQualifiedId,
        loadMeetings,
      }),
    );

    expect(result).toBe(deleteMeetingSubmitResults.deletedButCleanupFailed);
    expect(removeMeetingByQualifiedId).toHaveBeenCalledWith(meetingId);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(primaryModalShow).toHaveBeenCalledWith(
      PrimaryModal.type.ACKNOWLEDGE,
      expect.objectContaining({
        text: expect.objectContaining({
          message: translateForTest('meetings.deleteModal.error.deleteSucceededButLocalCleanupFailed'),
        }),
      }),
      undefined,
      translateForTest,
    );
  });

  it('refreshes the list but keeps the meeting when delete fails before server deletion', async () => {
    const removeMeetingByQualifiedId = jest.fn();
    const deleteMeetingForAll = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.deleteFailed));
    const loadMeetings = jest.fn().mockResolvedValue(undefined);

    const result = await submitDeleteMeeting(
      createSubmitDeps({
        deleteMeetingForAll,
        removeMeetingByQualifiedId,
        loadMeetings,
      }),
    );

    expect(result).toBe(deleteMeetingSubmitResults.failed);
    expect(removeMeetingByQualifiedId).not.toHaveBeenCalled();
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(primaryModalShow).toHaveBeenCalledTimes(1);
  });

  it('blocks delete when the meeting became past before submit', async () => {
    const deleteMeetingForAll = jest.fn().mockReturnValue(task.resolve(undefined));

    const result = await submitDeleteMeeting(
      createSubmitDeps({
        deleteMeetingForAll,
        wallClock: pastWallClock,
      }),
    );

    expect(result).toBe(deleteMeetingSubmitResults.blocked);
    expect(deleteMeetingForAll).not.toHaveBeenCalled();
    expect(primaryModalShow).toHaveBeenCalledTimes(1);
  });

  it('shows feedback when selfUser is missing', async () => {
    const deleteMeetingForAll = jest.fn().mockReturnValue(task.resolve(undefined));

    const result = await submitDeleteMeeting(
      createSubmitDeps({
        deleteMeetingForAll,
        selfUser: undefined,
      }),
    );

    expect(result).toBe(deleteMeetingSubmitResults.blocked);
    expect(deleteMeetingForAll).not.toHaveBeenCalled();
    expect(primaryModalShow).toHaveBeenCalledTimes(1);
  });

  it('ignores a second submit for the same meeting while the first is pending', async () => {
    let releaseDelete!: () => void;
    const deleteGate = new Promise<void>(resolve => {
      releaseDelete = resolve;
    });
    const deleteMeetingForAll = jest.fn().mockReturnValue(
      task.tryOrElse(
        () => meetingSubmitErrors.deleteFailed,
        async () => {
          await deleteGate;
        },
      ),
    );
    const removeMeetingByQualifiedId = jest.fn();

    const deps = createSubmitDeps({
      deleteMeetingForAll,
      removeMeetingByQualifiedId,
    });

    const firstSubmit = submitDeleteMeeting(deps);
    const secondSubmit = submitDeleteMeeting(deps);

    expect(await secondSubmit).toBe(deleteMeetingSubmitResults.alreadyInFlight);
    expect(deleteMeetingForAll).toHaveBeenCalledTimes(1);

    releaseDelete();
    expect(await firstSubmit).toBe(deleteMeetingSubmitResults.succeeded);
    expect(removeMeetingByQualifiedId).toHaveBeenCalledWith(meetingId);
  });
});
