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
import {createMeetingsTeam, loginMeetingsUsers} from 'test/e2e_tests/utils/meetings.util';

const MEETING_TITLE = 'Team sync';
const UPDATED_MEETING_TITLE = 'Updated team sync';

test.describe.configure({mode: 'serial'});

test.describe('Meetings CRUD', () => {
  test('create meeting — host sees it in the list', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

    await meetings.openMeetingsTab();
    await meetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
    await meetings.waitForMeetingInList(MEETING_TITLE);
    await expect(meetings.meetingListItem(MEETING_TITLE)).toBeVisible();
  });

  test('invitee sees meeting in the list', async ({createUser, createTeam, createPage}) => {
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

  test('invitee sees invite notification', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
    const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

    await ownerMeetings.openMeetingsTab();
    await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);

    await memberMeetings.waitForNotificationContaining(`Update: ${MEETING_TITLE}`);
    await expect(memberMeetings.notificationCards()).toHaveCount(1);
  });

  test('host can edit meeting info', async ({createUser, createTeam, createPage}) => {
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

  test('edited meeting info syncs to invitee list', async ({createUser, createTeam, createPage}) => {
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

  test('invitee sees update notification after edit', async ({createUser, createTeam, createPage}) => {
    const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
    const member = members[0];

    const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);
    const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
    const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

    await ownerMeetings.openMeetingsTab();
    await ownerMeetings.scheduleMeeting(MEETING_TITLE, [member.fullName]);
    await ownerMeetings.waitForMeetingInList(MEETING_TITLE);

    await ownerMeetings.editMeeting(MEETING_TITLE, {newTitle: UPDATED_MEETING_TITLE});

    await memberMeetings.waitForNotificationContaining(`Update: ${UPDATED_MEETING_TITLE}`);
  });

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

  test('host can delete meeting for everyone', async ({createUser, createTeam, createPage}) => {
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

  test('invitee can delete meeting for themselves', async ({createUser, createTeam, createPage}) => {
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
    await ownerMeetings.waitForMeetingInList(MEETING_TITLE);
  });
});
