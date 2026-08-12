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

import type {Page} from '@playwright/test';

import {PageManager} from 'test/e2e_tests/pageManager';
import {expect, LOGIN_TIMEOUT, test} from 'test/e2e_tests/test.fixtures';

const loginWithMeetingsEnabled = (user: {email: string; password: string}) => async (page: Page) => {
  const pageManager = PageManager.from(page);
  const {pages, components} = pageManager.webapp;
  await pageManager.openLoginPage();
  await pages.login().login(user);
  await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
  const clientUrl = new URL('/?enabled-features=meetings#/clients', page.url());
  await page.goto(clientUrl.href, {waitUntil: 'domcontentloaded'});
  await expect.poll(() => new URL(page.url()).searchParams.get('enabled-features')).toBe('meetings');
  await components.conversationSidebar().sidebar.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
};

const scheduleMeeting = async (ownerPage: Page, title: string, participantNames: string[]) => {
  await ownerPage.locator('[data-uie-name="go-meetings"]').click();
  await ownerPage.locator('[data-uie-name="schedule-meeting"]').click();

  const modal = ownerPage.locator('[data-uie-name="schedule-meeting-modal"]');
  await modal.locator('[data-uie-name="schedule-meeting-title"]').fill(title);

  const participants = modal.locator('[data-uie-name="schedule-meeting-participants"]');
  for (const participantName of participantNames) {
    await participants.locator('[data-uie-name="schedule-meeting-participants-input"]').fill(participantName);
    await ownerPage.locator('[data-uie-name="item-user"]').filter({hasText: participantName}).click();
  }

  await modal.locator('[data-uie-name="schedule-meeting-modal-submit"]').click();
  await expect(modal).toBeHidden();
};

const meetingNotificationCards = (page: Page) =>
  page.locator('[data-uie-name="meeting-notification-host"] [data-uie-name^="meeting-notification-card-"]');

const expectInvitationCard = async (page: Page, title: string) => {
  const host = page.locator('[data-uie-name="meeting-notification-host"]');
  await expect.poll(() => host.count(), {timeout: 30_000}).toBe(1);
  await host.getByTestId('meeting-notification-expand').click();

  const cards = meetingNotificationCards(page);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText(`Invitation: ${title}`);
  await expect(cards).not.toContainText(`Update: ${title}`);
};

const editMeetingToAddParticipant = async (ownerPage: Page, title: string, participantName: string) => {
  const meeting = ownerPage.locator('[data-uie-name="item-meeting"]').filter({hasText: title});
  await meeting.getByRole('button').last().click();
  await ownerPage.getByRole('menuitem').getByText('Edit meeting').click();

  const modal = ownerPage.locator('[data-uie-name="schedule-meeting-modal"]');
  const participants = modal.locator('[data-uie-name="schedule-meeting-participants"]');
  await participants.locator('[data-uie-name="schedule-meeting-participants-input"]').fill(participantName);
  await ownerPage.locator('[data-uie-name="item-user"]').filter({hasText: participantName}).click();
  await modal.locator('[data-uie-name="schedule-meeting-modal-submit"]').click();
  await expect(modal).toBeHidden();
};

test('single participant meeting notification', async ({createUser, createTeam, createPage}) => {
  const member = await createUser();
  const team = await createTeam('Meetings', {users: [member], features: {meetings: true}});
  const owner = team.owner;

  const [ownerPage, memberPage] = await Promise.all([
    createPage(loginWithMeetingsEnabled(owner)),
    createPage(loginWithMeetingsEnabled(member)),
  ]);

  await scheduleMeeting(ownerPage, 'Single participant meeting', [member.fullName]);
  await expectInvitationCard(memberPage, 'Single participant meeting');
});

test('two participant meeting sends exactly one invitation to each participant', async ({
  createUser,
  createTeam,
  createPage,
}) => {
  const firstParticipant = await createUser();
  const secondParticipant = await createUser();
  const team = await createTeam('Meetings', {
    users: [firstParticipant, secondParticipant],
    features: {meetings: true},
  });

  const [ownerPage, firstParticipantPage, secondParticipantPage] = await Promise.all([
    createPage(loginWithMeetingsEnabled(team.owner)),
    createPage(loginWithMeetingsEnabled(firstParticipant)),
    createPage(loginWithMeetingsEnabled(secondParticipant)),
  ]);

  await scheduleMeeting(ownerPage, 'Two participant meeting', [firstParticipant.fullName, secondParticipant.fullName]);

  await Promise.all([
    expectInvitationCard(firstParticipantPage, 'Two participant meeting'),
    expectInvitationCard(secondParticipantPage, 'Two participant meeting'),
  ]);
});

test('adding a participant sends only one invitation to the newly added participant', async ({
  createUser,
  createTeam,
  createPage,
}) => {
  const originalParticipant = await createUser();
  const newParticipant = await createUser();
  const team = await createTeam('Meetings', {users: [originalParticipant, newParticipant], features: {meetings: true}});

  const [ownerPage, originalParticipantPage, newParticipantPage] = await Promise.all([
    createPage(loginWithMeetingsEnabled(team.owner)),
    createPage(loginWithMeetingsEnabled(originalParticipant)),
    createPage(loginWithMeetingsEnabled(newParticipant)),
  ]);

  const title = 'Updated participants meeting';
  await scheduleMeeting(ownerPage, title, [originalParticipant.fullName]);
  await expectInvitationCard(originalParticipantPage, title);

  await editMeetingToAddParticipant(ownerPage, title, newParticipant.fullName);

  await expect(meetingNotificationCards(originalParticipantPage).filter({hasText: `Invitation: ${title}`})).toHaveCount(
    1,
  );
  await expectInvitationCard(newParticipantPage, title);
});
