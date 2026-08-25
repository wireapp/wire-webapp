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
import {createOngoingMeetingWindow, meetingWindowWithinPastEditPeriod} from 'test/e2e_tests/utils/meetingTime.util';
import {createMeetingsTeam, loginMeetingsUsers} from 'test/e2e_tests/utils/meetings.util';

const MEETING_TITLE = 'Team sync';
const UPDATED_MEETING_TITLE = 'Updated team sync';
const LARGE_MEETING_TITLE = 'Large meeting';
const DAILY_ONGOING_TITLE = 'Daily ongoing edit e2e';
const SINGLE_ONGOING_TITLE = 'Single ongoing edit e2e';
const ENDED_MEETING_TITLE = 'Ended meeting edit e2e';
const UPDATED_DAILY_TITLE = 'Daily ongoing edit updated';

test.describe.configure({mode: 'serial'});

test.describe('Meetings', () => {
  test.describe('Schedule', () => {
    test('host sees a new meeting in the list', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

      await meetings.openMeetingsTab();
      await meetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await meetings.waitForMeetingInList(MEETING_TITLE);
      await expect(meetings.meetingListItem(MEETING_TITLE)).toBeVisible();
    });

    test('invitee sees a meeting they were added to', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);

      await memberMeetings.openMeetingsTab();
      await memberMeetings.waitForMeetingInList(MEETING_TITLE);
      await expect(memberMeetings.meetingListItem(MEETING_TITLE)).toBeVisible();
    });

    test('host cannot pick a start date in the past', async ({createUser, createTeam, createPage}) => {
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
  });

  test.describe('Edit', () => {
    test('host can rename a meeting', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

      await meetings.openMeetingsTab();
      await meetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await meetings.waitForMeetingInList(MEETING_TITLE);

      await meetings.editMeeting(MEETING_TITLE, {newTitle: UPDATED_MEETING_TITLE});
      await meetings.waitForMeetingInList(UPDATED_MEETING_TITLE);
      await expect(meetings.meetingListItem(UPDATED_MEETING_TITLE)).toBeVisible();
    });

    test('invitee sees the renamed meeting', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await ownerMeetings.editMeeting(MEETING_TITLE, {newTitle: UPDATED_MEETING_TITLE});

      await memberMeetings.openMeetingsTab();
      await memberMeetings.waitForMeetingInList(UPDATED_MEETING_TITLE);
      await expect(memberMeetings.meetingListItem(UPDATED_MEETING_TITLE)).toBeVisible();
    });

    test('host can edit a future row of an ongoing recurring meeting without dropping today', async ({
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
      await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE, 2);

      await meetings.editMeeting(DAILY_ONGOING_TITLE, {setOngoingTimes: true});
      await meetings.waitForMeetingInList(DAILY_ONGOING_TITLE, 2);
      await meetings.expectEditMeetingActionVisible(DAILY_ONGOING_TITLE, true);

      await meetings.openEditMeetingModal(DAILY_ONGOING_TITLE, 1);
      await meetings.expectEditPrefillDateIsToday();
      await meetings.fillMeetingTitle(UPDATED_DAILY_TITLE);
      await meetings.submitScheduleMeetingModal();
      await meetings.assertNoSubmitErrorVisible();
      await meetings.waitForMeetingInList(UPDATED_DAILY_TITLE, 2);

      await meetings.openEditMeetingModal(UPDATED_DAILY_TITLE, 0);
      await meetings.expectEditPrefillDateIsToday();
    });

    test('host can edit an ongoing one-off meeting', async ({createUser, createTeam, createPage}) => {
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

    test('host can save an ongoing meeting whose start is already in the past', async ({
      createUser,
      createTeam,
      createPage,
    }) => {
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

    test('host cannot edit a meeting after it has ended', async ({createUser, createTeam, createPage}) => {
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
  });

  test.describe('Participants', () => {
    test('host can add a participant', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 2);
      const [firstMember, secondMember] = members;

      const [ownerPage, , secondMemberPage] = await loginMeetingsUsers(createPage, [owner, firstMember, secondMember]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const secondMemberMeetings = PageManager.from(secondMemberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [firstMember.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await ownerMeetings.editMeeting(MEETING_TITLE, {addParticipants: [secondMember.fullName]});

      await secondMemberMeetings.openMeetingsTab();
      await secondMemberMeetings.waitForMeetingInList(MEETING_TITLE);
      await expect(secondMemberMeetings.meetingListItem(MEETING_TITLE)).toBeVisible();
    });

    test('host can remove a participant', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 2);
      const [firstMember, secondMember] = members;

      const [ownerPage, firstMemberPage] = await loginMeetingsUsers(createPage, [owner, firstMember, secondMember]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const firstMemberMeetings = PageManager.from(firstMemberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [firstMember.fullName, secondMember.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await firstMemberMeetings.openMeetingsTab();
      await firstMemberMeetings.waitForMeetingInList(MEETING_TITLE);

      await ownerMeetings.editMeeting(MEETING_TITLE, {removeParticipants: [firstMember.fullName]});

      await firstMemberMeetings.waitForMeetingAbsentFromList(MEETING_TITLE);
    });
  });

  test.describe('Delete', () => {
    test('host can delete a meeting for everyone', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await memberMeetings.openMeetingsTab();
      await memberMeetings.waitForMeetingInList(MEETING_TITLE);

      await ownerMeetings.deleteMeetingForAll(MEETING_TITLE);

      await ownerMeetings.waitForMeetingAbsentFromList(MEETING_TITLE);
      await memberMeetings.waitForMeetingAbsentFromList(MEETING_TITLE);
      await memberMeetings.waitForNotificationContaining(`Canceled: ${MEETING_TITLE}`);
    });

    test('invitee can remove a meeting only for themselves', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await memberMeetings.openMeetingsTab();
      await memberMeetings.waitForMeetingInList(MEETING_TITLE);

      await memberMeetings.deleteMeetingForMe(MEETING_TITLE);

      await memberMeetings.waitForMeetingAbsentFromList(MEETING_TITLE);
      await memberMeetings.expectNoNotificationContaining(`Canceled: ${MEETING_TITLE}`);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);
    });
  });

  test.describe('Notifications', () => {
    test('invitee sees an invitation', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);

      await memberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`);
      await expect(memberMeetings.notificationCards()).toHaveCount(1);
      await expect(memberMeetings.notificationCards()).not.toContainText(`Update: ${MEETING_TITLE}`);
    });

    test('each invitee gets exactly one invitation', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 2);
      const [firstMember, secondMember] = members;

      const [ownerPage, firstMemberPage, secondMemberPage] = await loginMeetingsUsers(createPage, [
        owner,
        firstMember,
        secondMember,
      ]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const firstMemberMeetings = PageManager.from(firstMemberPage).webapp.pages.meetings();
      const secondMemberMeetings = PageManager.from(secondMemberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [firstMember.fullName, secondMember.fullName]);

      await Promise.all([
        firstMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`),
        secondMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`),
      ]);

      await expect(firstMemberMeetings.notificationCards()).toHaveCount(1);
      await expect(secondMemberMeetings.notificationCards()).toHaveCount(1);
    });

    test('invitee sees an update after a title change', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await memberPage.reload();
      await memberMeetings.openMeetingsTab();
      await memberMeetings.waitForMeetingInList(MEETING_TITLE);

      await ownerMeetings.editMeeting(MEETING_TITLE, {newTitle: UPDATED_MEETING_TITLE});

      await memberMeetings.waitForNotificationContaining(`Update: ${UPDATED_MEETING_TITLE}`);
      await expect(memberMeetings.notificationCardContaining(`Update: ${UPDATED_MEETING_TITLE}`)).toHaveCount(1);
      await expect(memberMeetings.notificationCardContaining(`Invitation: ${UPDATED_MEETING_TITLE}`)).toHaveCount(0);
      await expect(memberMeetings.notificationCards()).toHaveCount(1);
    });

    test('invitee sees an update after a time change', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
      const member = members[0];

      const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await memberPage.reload();
      await memberMeetings.openMeetingsTab();
      await memberMeetings.waitForMeetingInList(MEETING_TITLE);

      await ownerMeetings.editMeeting(MEETING_TITLE, {updateStartTime: true});

      await memberMeetings.waitForNotificationContaining(`Update: ${MEETING_TITLE}`);
      await expect(memberMeetings.notificationCardContaining(`Update: ${MEETING_TITLE}`)).toHaveCount(1);
      await expect(memberMeetings.notificationCardContaining(`Invitation: ${MEETING_TITLE}`)).toHaveCount(0);
      await expect(memberMeetings.notificationCards()).toHaveCount(1);
    });

    test('a newly added participant gets an invitation, existing ones do not', async ({
      createUser,
      createTeam,
      createPage,
    }) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 2);
      const [firstMember, secondMember] = members;

      const [ownerPage, firstMemberPage, secondMemberPage] = await loginMeetingsUsers(createPage, [
        owner,
        firstMember,
        secondMember,
      ]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const firstMemberMeetings = PageManager.from(firstMemberPage).webapp.pages.meetings();
      const secondMemberMeetings = PageManager.from(secondMemberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [firstMember.fullName]);
      await firstMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`);

      await ownerMeetings.editMeeting(MEETING_TITLE, {addParticipants: [secondMember.fullName]});

      await expect(firstMemberMeetings.notificationCardContaining(`Invitation: ${MEETING_TITLE}`)).toHaveCount(1);
      await secondMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`);
      await expect(secondMemberMeetings.notificationCardContaining(`Invitation: ${MEETING_TITLE}`)).toHaveCount(1);
    });

    test('a removed participant sees a cancellation and the old invitation is gone', async ({
      createUser,
      createTeam,
      createPage,
    }) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 2);
      const [firstMember, secondMember] = members;

      const [ownerPage, firstMemberPage] = await loginMeetingsUsers(createPage, [owner, firstMember, secondMember]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const firstMemberMeetings = PageManager.from(firstMemberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [firstMember.fullName, secondMember.fullName]);
      await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

      await firstMemberMeetings.openMeetingsTab();
      await firstMemberMeetings.waitForMeetingInList(MEETING_TITLE);
      await firstMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`);

      await ownerMeetings.editMeeting(MEETING_TITLE, {removeParticipants: [firstMember.fullName]});

      await firstMemberMeetings.waitForMeetingAbsentFromList(MEETING_TITLE);
      await firstMemberMeetings.waitForNotificationContaining(`Canceled: ${MEETING_TITLE}`);
      await expect(firstMemberMeetings.notificationCards()).toHaveCount(1);
      await expect(firstMemberMeetings.notificationCards()).not.toContainText(`Invitation: ${MEETING_TITLE}`);
      await expect(firstMemberMeetings.notificationCards()).not.toContainText(`Update: ${MEETING_TITLE}`);
    });

    test('re-adding someone sends a new invitation', async ({createUser, createTeam, createPage}) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 2);
      const [firstMember, secondMember] = members;

      const [ownerPage, firstMemberPage] = await loginMeetingsUsers(createPage, [owner, firstMember, secondMember]);
      const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
      const firstMemberMeetings = PageManager.from(firstMemberPage).webapp.pages.meetings();

      await ownerMeetings.openMeetingsTab();
      await ownerMeetings.scheduleMeeting(MEETING_TITLE, [secondMember.fullName]);
      await ownerMeetings.editMeeting(MEETING_TITLE, {addParticipants: [firstMember.fullName]});

      await firstMemberMeetings.waitForMeetingInList(MEETING_TITLE);
      await firstMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`);

      await ownerMeetings.editMeeting(MEETING_TITLE, {removeParticipants: [firstMember.fullName]});

      await firstMemberMeetings.waitForNotificationContaining(`Canceled: ${MEETING_TITLE}`);
      await expect(firstMemberMeetings.notificationCardContaining(`Invitation: ${MEETING_TITLE}`)).toHaveCount(0);

      await ownerMeetings.editMeeting(MEETING_TITLE, {addParticipants: [firstMember.fullName]});

      await firstMemberMeetings.waitForMeetingInList(MEETING_TITLE);
      await firstMemberMeetings.waitForNotificationContaining(`Invitation: ${MEETING_TITLE}`);
      await expect(firstMemberMeetings.notificationCardContaining(`Invitation: ${MEETING_TITLE}`)).toHaveCount(1);
    });
  });

  test.describe('Call', () => {
    test('host can start a large Meet now call without a confirmation dialog', async ({
      createUser,
      createTeam,
      createPage,
    }) => {
      const {owner, members} = await createMeetingsTeam(createUser, createTeam, 5);
      const [ownerPage] = await loginMeetingsUsers(createPage, [owner, ...members]);
      const ownerPages = PageManager.from(ownerPage).webapp.pages;
      const ownerModals = PageManager.from(ownerPage).webapp.modals;
      const meetings = ownerPages.meetings();

      await meetings.startMeetNow(
        LARGE_MEETING_TITLE,
        members.map(member => member.fullName),
      );

      await expect(ownerModals.withoutTitle().modal).toBeHidden();
      await expect(ownerPages.calling().callCell).toBeVisible();
    });
  });
});
