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

import {expect, type Locator, type Page} from '@playwright/test';

import {ConfirmModal} from '../modals/confirm.modal';

const MEETINGS_LIST_TIMEOUT_MS = 30_000;

export class MeetingsPage {
  private readonly page: Page;

  readonly meetingsTab: Locator;
  readonly meetingsList: Locator;
  readonly emptyMeetingsList: Locator;
  readonly scheduleMeetingButton: Locator;
  readonly createMeetingButton: Locator;
  readonly scheduleMeetingModal: Locator;
  readonly notificationHost: Locator;

  constructor(page: Page) {
    this.page = page;

    this.meetingsTab = page.locator('[data-uie-name="go-meetings"]');
    this.meetingsList = page.locator('[data-uie-name="meetings-list"]');
    this.emptyMeetingsList = page.locator('[data-uie-name="empty-meetings-list"]');
    this.scheduleMeetingButton = page.locator('[data-uie-name="schedule-meeting"]');
    this.createMeetingButton = page.locator('[data-uie-name="create-meeting"]');
    this.scheduleMeetingModal = page.locator('[data-uie-name="schedule-meeting-modal"]');
    this.notificationHost = page.locator('[data-uie-name="meeting-notification-host"]');
  }

  async openMeetingsTab() {
    await this.meetingsTab.click();
  }

  async openScheduleMeetingModal() {
    if (await this.emptyMeetingsList.isVisible()) {
      await this.scheduleMeetingButton.click();
      return;
    }

    await this.createMeetingButton.click();
    await this.page.getByRole('menu').getByRole('button', {name: 'Schedule Meeting'}).click();
  }

  meetingListItem(title: string) {
    return this.meetingsList.filter({hasText: title});
  }

  async waitForMeetingInList(title: string) {
    await this.openMeetingsTab();
    await expect
      .poll(() => this.meetingListItem(title).count(), {timeout: MEETINGS_LIST_TIMEOUT_MS})
      .toBeGreaterThan(0);
  }

  async waitForMeetingAbsentFromList(title: string) {
    await expect
      .poll(
        async () => {
          await this.page.locator('[data-uie-name="go-people"]').click();
          await this.openMeetingsTab();
          return this.meetingListItem(title).count();
        },
        {timeout: MEETINGS_LIST_TIMEOUT_MS},
      )
      .toBe(0);
  }

  async assertNoSubmitErrorVisible() {
    await expect(
      this.page.getByText('The meeting was updated, but some participants could not be removed'),
    ).toBeHidden();
  }

  meetingTitleInput() {
    return this.scheduleMeetingModal.locator('input[data-uie-name="schedule-meeting-title"]');
  }

  async fillMeetingTitle(title: string) {
    const titleInput = this.scheduleMeetingModal.getByLabel('Title', {exact: true});
    await titleInput.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
  }

  async dismissBlockingModals() {
    const acknowledgeModal = this.page.locator('[data-uie-name="modal-template-acknowledge"]');
    if (await acknowledgeModal.isVisible()) {
      await acknowledgeModal.getByTestId('do-action').click();
      await expect(acknowledgeModal).toBeHidden();
    }
  }

  async closeParticipantsPicker() {
    const dropdown = this.page.locator('[data-uie-name="dropdown-schedule-meeting-participants"]');
    if (!(await dropdown.isVisible())) {
      return;
    }

    await this.scheduleMeetingModal.getByLabel('Title', {exact: true}).click();
    await expect(dropdown).toBeHidden();
  }

  async addParticipant(fullName: string) {
    const participants = this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-participants"]');
    const dropdown = this.page.locator('[data-uie-name="dropdown-schedule-meeting-participants"]');
    const participantOption = dropdown.locator('[data-uie-name="item-user"]').filter({hasText: fullName});

    await participants.locator('[data-uie-name="schedule-meeting-participants-input"]').fill(fullName);
    await expect(participantOption).toBeVisible();
    await participantOption.click();
    await this.closeParticipantsPicker();
  }

  async openParticipantsPicker() {
    const participants = this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-participants"]');
    const dropdown = this.page.locator('[data-uie-name="dropdown-schedule-meeting-participants"]');

    if (!(await dropdown.isVisible())) {
      await participants.locator('[data-uie-name="schedule-meeting-participants-toggle"]').click();
    }

    await expect(dropdown).toBeVisible();
    return dropdown;
  }

  async removeParticipant(fullName: string) {
    const dropdown = await this.openParticipantsPicker();
    const selectedSectionToggle = dropdown.locator('[data-uie-name="do-toggle-selected-search-list"]');
    const selectedList = dropdown.locator('[data-uie-name="selected-search-list"]');
    const selectedParticipant = selectedList.locator('[data-uie-name="item-user"]').filter({hasText: fullName});

    if (await selectedSectionToggle.isVisible()) {
      if (!(await selectedParticipant.isVisible())) {
        await selectedSectionToggle.click();
      }
    }

    await expect(selectedParticipant).toBeVisible();
    await selectedParticipant.click();
    await expect(selectedParticipant).toBeHidden();
    await this.closeParticipantsPicker();
  }

  startTimeCombobox() {
    return this.scheduleMeetingModal.getByRole('group', {name: 'Starts'}).getByRole('combobox', {name: 'Select time'});
  }

  startDateOpenCalendarButton() {
    return this.scheduleMeetingModal.getByRole('group', {name: 'Starts'}).getByRole('button', {name: 'Open calendar'});
  }

  async selectLatestAvailableStartTime() {
    const startTimeCombobox = this.startTimeCombobox();
    await startTimeCombobox.scrollIntoViewIfNeeded();
    await startTimeCombobox.click();
    await this.page.getByRole('option').last().click();
  }

  async setMeetingStartDateToTomorrow() {
    await this.startDateOpenCalendarButton().scrollIntoViewIfNeeded();
    await this.startDateOpenCalendarButton().click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowLabel = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    await this.page.getByRole('button', {name: tomorrowLabel}).click();
  }

  async fixStartTimeInPastValidationError() {
    const startInPastError = this.scheduleMeetingModal.getByText('Start time must be in the future');
    if (!(await startInPastError.isVisible())) {
      return;
    }

    await this.selectLatestAvailableStartTime();

    if (await startInPastError.isVisible()) {
      await this.setMeetingStartDateToTomorrow();
      await this.selectLatestAvailableStartTime();
    }
  }

  async submitScheduleMeetingModal() {
    await this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-modal-submit"]').click();

    const startInPastError = this.scheduleMeetingModal.getByText('Start time must be in the future');
    if (await startInPastError.isVisible()) {
      await this.fixStartTimeInPastValidationError();
      await this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-modal-submit"]').click();
    }

    await expect(this.scheduleMeetingModal).toBeHidden({timeout: MEETINGS_LIST_TIMEOUT_MS});
    await this.dismissBlockingModals();
  }

  async scheduleMeeting(title: string, participantNames: string[]) {
    await this.openScheduleMeetingModal();
    await this.fillMeetingTitle(title);

    for (const participantName of participantNames) {
      await this.addParticipant(participantName);
    }

    await this.submitScheduleMeetingModal();
  }

  async openMeetingContextMenu(title: string) {
    await this.openMeetingsTab();
    await this.dismissBlockingModals();
    const meetingItem = this.meetingListItem(title);
    await meetingItem.getByRole('button').last().click();
    return this.page.getByRole('menu');
  }

  async editMeeting(
    title: string,
    updates: {newTitle?: string; addParticipants?: string[]; removeParticipants?: string[]},
  ) {
    const menu = await this.openMeetingContextMenu(title);
    await menu.getByRole('button', {name: 'Edit meeting'}).click();
    await expect(this.scheduleMeetingModal).toBeVisible();
    await expect(this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-form"]')).toHaveAttribute(
      'data-uie-mode',
      'edit',
    );
    await expect(this.meetingTitleInput()).toHaveValue(title);

    if (updates.newTitle !== undefined) {
      await this.fillMeetingTitle(updates.newTitle);
    }

    for (const participantName of updates.addParticipants ?? []) {
      await this.addParticipant(participantName);
    }

    for (const participantName of updates.removeParticipants ?? []) {
      await this.removeParticipant(participantName);
    }

    await this.submitScheduleMeetingModal();
    await this.assertNoSubmitErrorVisible();
  }

  async deleteMeetingForAll(title: string) {
    const menu = await this.openMeetingContextMenu(title);
    await menu.getByRole('button', {name: 'Delete meeting for everyone'}).click();

    const confirmModal = new ConfirmModal(this.page);
    await confirmModal.clickAction();
  }

  async deleteMeetingForMe(title: string) {
    const menu = await this.openMeetingContextMenu(title);
    await menu.getByRole('button', {name: 'Delete meeting for me'}).click();

    const confirmModal = new ConfirmModal(this.page);
    await confirmModal.clickAction();
  }

  async expandNotifications() {
    await this.notificationHost.getByTestId('meeting-notification-expand').click();
  }

  notificationCards() {
    return this.notificationHost.locator('[data-uie-name^="meeting-notification-card-"]');
  }

  async waitForNotificationHost() {
    await expect.poll(() => this.notificationHost.count(), {timeout: MEETINGS_LIST_TIMEOUT_MS}).toBe(1);
    await expect(this.notificationHost).toBeVisible();
  }

  notificationCardContaining(text: string) {
    return this.notificationCards().filter({hasText: text});
  }

  async waitForNotificationContaining(text: string) {
    await this.waitForNotificationHost();
    await this.expandNotifications();
    await expect(this.notificationCardContaining(text)).toBeVisible({timeout: MEETINGS_LIST_TIMEOUT_MS});
  }

  async expectNoNotificationContaining(text: string) {
    await expect(this.notificationCardContaining(text)).toHaveCount(0, {timeout: MEETINGS_LIST_TIMEOUT_MS});
  }
}
