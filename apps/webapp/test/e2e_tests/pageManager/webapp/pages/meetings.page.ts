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
import {
  createEndedMeetingWindow,
  createOngoingMeetingWindow,
  formatMeetingDateIso,
  formatMeetingTimeLabel,
} from 'test/e2e_tests/utils/meetingTime.util';

const MEETINGS_LIST_TIMEOUT_MS = 30_000;

type ScheduleMeetingRecurrenceLabel = 'Daily' | 'Never';
type ScheduleMeetingModalMode = 'create' | 'edit';

export class MeetingsPage {
  private readonly page: Page;

  readonly meetingsTab: Locator;
  readonly meetingsList: Locator;
  readonly emptyMeetingsList: Locator;
  readonly scheduleMeetingButton: Locator;
  readonly createMeetingButton: Locator;
  readonly scheduleMeetingModal: Locator;
  readonly meetNowModal: Locator;
  readonly notificationHost: Locator;

  constructor(page: Page) {
    this.page = page;

    this.meetingsTab = page.getByTestId('go-meetings');
    this.meetingsList = page.getByTestId('meetings-list');
    this.emptyMeetingsList = page.getByTestId('empty-meetings-list');
    this.scheduleMeetingButton = page.getByTestId('schedule-meeting');
    this.createMeetingButton = page.getByTestId('create-meeting');
    this.scheduleMeetingModal = page.getByTestId('schedule-meeting-modal');
    this.meetNowModal = page.getByTestId('meet-now-modal');
    this.notificationHost = page.getByTestId('meeting-notification-host');
  }

  async openMeetingsTab() {
    if ((await this.meetingsTab.getAttribute('aria-selected')) === 'true') {
      return;
    }

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

  async openMeetNowModal() {
    await this.openMeetingsTab();
    await this.createMeetingButton.click();
    await this.page.getByRole('menu').getByRole('button', {name: 'Meet now'}).click();
    await expect(this.meetNowModal).toBeVisible();
  }

  async addMeetNowParticipant(fullName: string) {
    const participantsInput = this.meetNowModal.getByTestId('meet-now-participants').locator('input');
    const participantOption = this.page.getByTestId('item-user').filter({hasText: fullName});

    await participantsInput.fill(fullName);
    await expect(participantOption).toBeVisible();
    await participantOption.click();
  }

  async startMeetNow(title: string, participantNames: string[]) {
    await this.openMeetNowModal();
    await this.meetNowModal.getByTestId('meet-now-title').fill(title);

    for (const participantName of participantNames) {
      await this.addMeetNowParticipant(participantName);
    }

    await this.meetNowModal.getByRole('button', {name: 'Start meeting'}).click();
    await expect(this.meetNowModal).toBeHidden();
  }

  meetingListItem(title: string) {
    return this.meetingsList.locator(`[data-uie-name="item-meeting"][data-uie-value="${title}"]`);
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
          await this.page.getByTestId('go-people').click();
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
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-title');
  }

  async fillMeetingTitle(title: string) {
    const titleInput = this.scheduleMeetingModal.getByLabel('Title', {exact: true});
    await titleInput.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
  }

  async dismissBlockingModals() {
    const acknowledgeModal = this.page.getByTestId('modal-template-acknowledge');
    if (await acknowledgeModal.isVisible()) {
      await acknowledgeModal.getByTestId('do-action').click();
      await expect(acknowledgeModal).toBeHidden();
    }

    if (await this.scheduleMeetingModal.isVisible()) {
      await this.scheduleMeetingModal.getByRole('button', {name: 'Close'}).click();
      await expect(this.scheduleMeetingModal).toBeHidden();
    }

    const openModal = this.page.locator('.modal.show');
    if (await openModal.isVisible()) {
      await this.page.keyboard.press('Escape');
    }
  }

  async closeParticipantsPicker() {
    const dropdown = this.page.getByTestId('dropdown-schedule-meeting-participants');
    if (!(await dropdown.isVisible())) {
      return;
    }

    await this.scheduleMeetingModal.getByLabel('Title', {exact: true}).click();
    await expect(dropdown).toBeHidden();
  }

  async addParticipant(fullName: string) {
    const participants = this.scheduleMeetingModal.getByTestId('schedule-meeting-participants');
    const dropdown = this.page.getByTestId('dropdown-schedule-meeting-participants');
    const participantOption = dropdown.getByTestId('item-user').filter({hasText: fullName});

    await participants.getByTestId('schedule-meeting-participants-input').fill(fullName);
    await expect(participantOption).toBeVisible();
    await participantOption.click();
    await this.closeParticipantsPicker();
  }

  async openParticipantsPicker() {
    const participants = this.scheduleMeetingModal.getByTestId('schedule-meeting-participants');
    const dropdown = this.page.getByTestId('dropdown-schedule-meeting-participants');

    if (!(await dropdown.isVisible())) {
      await participants.getByTestId('schedule-meeting-participants-toggle').click();
    }

    await expect(dropdown).toBeVisible();
    return dropdown;
  }

  async removeParticipant(fullName: string) {
    const dropdown = await this.openParticipantsPicker();
    const selectedSectionToggle = dropdown.getByTestId('do-toggle-selected-search-list');
    const selectedList = dropdown.getByTestId('selected-search-list');
    const selectedParticipant = selectedList.getByTestId('item-user').filter({hasText: fullName});

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

  scheduleMeetingForm() {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-form');
  }

  async scheduleMeetingModalMode(): Promise<ScheduleMeetingModalMode> {
    const mode = await this.scheduleMeetingForm().getAttribute('data-uie-mode');
    if (mode === 'create' || mode === 'edit') {
      return mode;
    }

    throw new Error(`Unexpected schedule meeting modal mode: ${mode ?? 'missing'}`);
  }

  startDateInput() {
    return this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-start-date"] input[type="text"]');
  }

  endDateInput() {
    return this.scheduleMeetingModal.locator('[data-uie-name="schedule-meeting-end-date"] input[type="text"]');
  }

  recurrenceSelect() {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-recurrence');
  }

  async selectRecurrence(label: ScheduleMeetingRecurrenceLabel) {
    const recurrence = this.recurrenceSelect();
    await recurrence.scrollIntoViewIfNeeded();
    await recurrence.click();
    await this.page.getByRole('option', {name: label}).click();
  }

  private timePicker(groupName: 'Starts' | 'Ends') {
    const dataUieName = groupName === 'Starts' ? 'schedule-meeting-start-time' : 'schedule-meeting-end-time';
    return this.scheduleMeetingModal.locator(`[data-uie-name="${dataUieName}"] [data-uie-name="${dataUieName}"]`);
  }

  async selectTimeForGroup(groupName: 'Starts' | 'Ends', timeLabel: string) {
    const timePicker = this.timePicker(groupName);
    await timePicker.scrollIntoViewIfNeeded();
    await timePicker.click();
    await this.page.getByRole('option', {name: timeLabel, exact: true}).click();
  }

  async selectLatestAvailableStartTime() {
    const startTimeCombobox = this.timePicker('Starts');
    await startTimeCombobox.scrollIntoViewIfNeeded();
    await startTimeCombobox.click();
    const startTimeOptions = this.page.getByRole('option');
    const optionCount = await startTimeOptions.count();
    await startTimeOptions.nth(Math.min(1, optionCount - 1)).click();
  }

  async setMeetingStartDate(date: Date) {
    await this.startDateOpenCalendarButton().scrollIntoViewIfNeeded();
    await this.startDateOpenCalendarButton().click();

    const dateLabel = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    await this.page.getByRole('button', {name: dateLabel}).click();
  }

  async setMeetingStartDateToTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.setMeetingStartDate(tomorrow);
  }

  async setMeetingTimes(start: Date, end: Date) {
    const mode = await this.scheduleMeetingModalMode();
    if (mode === 'create') {
      await this.setMeetingStartDate(start);
    }

    await this.selectTimeForGroup('Starts', formatMeetingTimeLabel(start));
    await this.selectTimeForGroup('Ends', formatMeetingTimeLabel(end));
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

  startInPastError() {
    return this.scheduleMeetingModal.getByText('Start time must be in the future');
  }

  async submitScheduleMeetingModal(options: {expectSuccess?: boolean} = {}) {
    const {expectSuccess = true} = options;
    const mode = await this.scheduleMeetingModalMode();

    await this.scheduleMeetingModal.getByTestId('schedule-meeting-modal-submit').click();

    const startInPastError = this.startInPastError();
    if (expectSuccess && mode === 'create' && (await startInPastError.isVisible())) {
      await this.fixStartTimeInPastValidationError();
      await this.scheduleMeetingModal.getByTestId('schedule-meeting-modal-submit').click();
    }

    if (!expectSuccess) {
      return;
    }

    await expect(this.scheduleMeetingModal).toBeHidden({timeout: MEETINGS_LIST_TIMEOUT_MS});
    await this.dismissBlockingModals();
  }

  async scheduleMeeting(
    title: string,
    participantNames: string[],
    options: {recurrence?: ScheduleMeetingRecurrenceLabel} = {},
  ) {
    await this.openScheduleMeetingModal();
    await this.fillMeetingTitle(title);

    if (options.recurrence !== undefined) {
      await this.selectRecurrence(options.recurrence);
    }

    for (const participantName of participantNames) {
      await this.addParticipant(participantName);
    }

    await this.submitScheduleMeetingModal();
  }

  async openEditMeetingModal(title: string) {
    const menu = await this.openMeetingContextMenu(title);
    await menu.getByRole('button', {name: 'Edit meeting'}).click();
    await expect(this.scheduleMeetingModal).toBeVisible();
    await expect(this.scheduleMeetingForm()).toHaveAttribute('data-uie-mode', 'edit');
  }

  async expectEditMeetingActionVisible(title: string, visible: boolean) {
    const menu = await this.openMeetingContextMenu(title);
    const editAction = menu.getByRole('button', {name: 'Edit meeting'});

    if (visible) {
      await expect(editAction).toBeVisible();
    } else {
      await expect(editAction).toBeHidden();
    }

    await this.page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }

  async expectEditPrefillDateIsToday() {
    const today = formatMeetingDateIso(new Date());
    await expect(this.startDateInput()).toHaveValue(today);
  }

  async configureOngoingMeetingTimes() {
    const {start, end} = createOngoingMeetingWindow();
    await this.setMeetingTimes(start, end);
  }

  async configureEndedMeetingTimes() {
    const {start, end} = createEndedMeetingWindow();
    await this.setMeetingTimes(start, end);
  }

  async openMeetingContextMenu(title: string) {
    await this.openMeetingsTab();
    await this.dismissBlockingModals();
    const meetingItem = this.meetingListItem(title).first();
    await meetingItem.getByRole('button').last().click();
    return this.page.getByRole('menu');
  }

  async editMeeting(
    title: string,
    updates: {
      newTitle?: string;
      updateStartTime?: boolean;
      setOngoingTimes?: boolean;
      setEndedTimes?: boolean;
      addParticipants?: string[];
      removeParticipants?: string[];
    },
  ) {
    await this.openEditMeetingModal(title);
    await expect(this.meetingTitleInput()).toHaveValue(title);

    if (updates.newTitle !== undefined) {
      await this.fillMeetingTitle(updates.newTitle);
    }

    if (updates.setOngoingTimes) {
      await this.configureOngoingMeetingTimes();
    }

    if (updates.setEndedTimes) {
      await this.configureEndedMeetingTimes();
    }

    if (updates.updateStartTime) {
      await this.selectLatestAvailableStartTime();
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
    const expandButton = this.notificationHost.getByTestId('meeting-notification-expand');
    if ((await expandButton.getAttribute('aria-expanded')) !== 'true') {
      await expandButton.click();
    }
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
