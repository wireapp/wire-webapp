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
 */

import {PageManager} from 'test/e2e_tests/pageManager';
import {expect, test} from 'test/e2e_tests/test.fixtures';
import {
  createOngoingMeetingWindow,
  formatMeetingDateIso,
  meetingWindowWithinPastEditPeriod,
} from 'test/e2e_tests/utils/meetingTime.util';
import {createMeetingsTeam, loginMeetingsUsers} from 'test/e2e_tests/utils/meetings.util';

const DAILY_ONGOING_TITLE = 'Daily ongoing edit e2e';
const SINGLE_ONGOING_TITLE = 'Single ongoing edit e2e';
const ENDED_MEETING_TITLE = 'Ended meeting edit e2e';
const UPDATED_DAILY_TITLE = 'Daily ongoing edit updated';

test.describe.configure({mode: 'serial'});

test.describe('Meetings ongoing edit (WPB-27894)', () => {
  test('recurring daily meeting — edit while ongoing keeps it in the list', async ({
    createUser,
    createTeam,
    createPage,
  }) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(DAILY_ONGOING_TITLE, [member.fullName], {recurrence: 'Daily'});
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);

    await meetings.editMeeting(DAILY_ONGOING_TITLE, {setOngoingTimes: true});
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);
    await meetings.expectEditMeetingActionVisible(DAILY_ONGOING_TITLE, true);

    await meetings.editMeeting(DAILY_ONGOING_TITLE, {newTitle: UPDATED_DAILY_TITLE});
    await meetings.waitForMeetingInList(UPDATED_DAILY_TITLE);
  });

  test('non-recurring meeting — edit while ongoing works', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(SINGLE_ONGOING_TITLE, [member.fullName]);
    await meetings.waitForMeetingInList(SINGLE_ONGOING_TITLE);

    await meetings.editMeeting(SINGLE_ONGOING_TITLE, {setOngoingTimes: true});
    await meetings.waitForMeetingInList(SINGLE_ONGOING_TITLE);
    await meetings.expectEditMeetingActionVisible(SINGLE_ONGOING_TITLE, true);
  });

  test('edit is hidden after the meeting ended', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(ENDED_MEETING_TITLE, [member.fullName]);
    await meetings.waitForMeetingInList(ENDED_MEETING_TITLE);

    await meetings.editMeeting(ENDED_MEETING_TITLE, {setEndedTimes: true});
    await meetings.waitForMeetingInList(ENDED_MEETING_TITLE);

    await meetings.expectEditMeetingActionVisible(ENDED_MEETING_TITLE, false);
  });

  test('edit is available while the meeting is ongoing', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(DAILY_ONGOING_TITLE, [member.fullName], {recurrence: 'Daily'});
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);

    await meetings.editMeeting(DAILY_ONGOING_TITLE, {setOngoingTimes: true});
    await meetings.expectEditMeetingActionVisible(DAILY_ONGOING_TITLE, true);
  });

  test('create prevents selecting a past date', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.openScheduleMeetingModal();
    await meetings.fillMeetingTitle('Past start create e2e');
    await meetings.addParticipant(member.fullName);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLabel = yesterday.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    await meetings.startDateOpenCalendarButton().click();
    await expect(ownerPage.getByRole('button', {name: yesterdayLabel})).toBeDisabled();
  });

  test('edit accepts a start time in the past for an ongoing meeting', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];
    const {start} = createOngoingMeetingWindow();
    expect(meetingWindowWithinPastEditPeriod(start)).toBe(true);

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(DAILY_ONGOING_TITLE, [member.fullName], {recurrence: 'Daily'});
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);

    await meetings.openEditMeetingModal(DAILY_ONGOING_TITLE);
    await meetings.configureOngoingMeetingTimes();
    await expect(meetings.startInPastError()).toBeHidden();
    await meetings.submitScheduleMeetingModal();
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);
  });

  test('edit prefill keeps today after setting ongoing times', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];
    const today = formatMeetingDateIso(new Date());

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(DAILY_ONGOING_TITLE, [member.fullName], {recurrence: 'Daily'});
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);

    await meetings.editMeeting(DAILY_ONGOING_TITLE, {setOngoingTimes: true});
    await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE);

    await meetings.openEditMeetingModal(DAILY_ONGOING_TITLE);
    await meetings.expectEditPrefillDateIsToday();
    await expect(meetings.startDateInput()).toHaveValue(today);
  });
});
