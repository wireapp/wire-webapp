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
import {gunzipSync} from 'node:zlib';
import {ConfirmModal} from '../modals/confirm.modal';
import {
  createEndedMeetingWindow,
  createOngoingMeetingWindow,
  formatMeetingDateIso,
  formatMeetingTimeLabel,
} from '../../../utils/meetingTime.util';
import type {Request} from 'playwright-core';

const MEETINGS_LIST_TIMEOUT_MS = 30_000;

type ScheduleMeetingRecurrenceLabel = 'Never' | 'Daily' | 'Weekly' | 'Every two weeks' | 'Every four weeks';
type ScheduleMeetingModalMode = 'create' | 'edit';
type MeetingTimelineRow = {
  index: number;
  kind: 'day' | 'meeting';
  dayHeading: string;
  title: string;
  text: string;
};
type MeetingOccurrenceSnapshot = {
  dayHeading: string;
  text: string;
};

export class MeetingsPage {
  private readonly page: Page;

  readonly meetingsTab: Locator;
  readonly meetingsList: Locator;
  readonly emptyMeetingsList: Locator;
  readonly meetNowButton: Locator;
  readonly scheduleMeetingButton: Locator;
  readonly scheduleMeetingModal: Locator;
  readonly meetNowModal: Locator;
  readonly meetingPrepModal: Locator;
  readonly notificationHost: Locator;
  readonly emptyMeetingsTitle: Locator;
  readonly emptyMeetingsDescription: Locator;
  readonly emptyScheduleMeetingButton: Locator;
  readonly emptyMeetNowButton: Locator;
  readonly meetingEntries: Locator;
  readonly scheduleMeetingSubmitButton: Locator;
  readonly meetingsLoadError: Locator;
  readonly meetingsLoadErrorMessage: Locator;
  readonly meetingsRefreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.meetingsTab = page.getByTestId('go-meetings');
    this.meetingsList = page.getByTestId('meetings-list');
    this.emptyMeetingsList = page.getByTestId('empty-meetings-list');
    this.emptyMeetingsTitle = this.emptyMeetingsList.locator('p').nth(0);
    this.emptyMeetingsDescription = this.emptyMeetingsList.locator('p').nth(1);
    this.emptyScheduleMeetingButton = this.emptyMeetingsList.getByRole('button', {
      name: 'Schedule Meeting',
      exact: true,
    });
    this.emptyMeetNowButton = this.emptyMeetingsList.getByRole('button', {name: 'Meet Now', exact: true});
    this.meetingEntries = this.meetingsList.getByTestId('item-meeting');
    this.meetNowButton = page.getByTestId('meet-now');
    this.scheduleMeetingButton = page.locator('header').getByTestId('schedule-meeting');
    this.scheduleMeetingModal = page.getByTestId('schedule-meeting-modal');
    this.scheduleMeetingSubmitButton = this.scheduleMeetingModal.getByTestId('schedule-meeting-modal-submit');
    this.meetNowModal = page.getByTestId('meet-now-modal');
    this.meetingPrepModal = page.getByTestId('meeting-prep-modal');
    this.notificationHost = page.getByTestId('meeting-notification-host');
    this.meetingsLoadError = page.getByTestId('meetings-list-error');
    this.meetingsLoadErrorMessage = this.meetingsLoadError.locator('p');
    this.meetingsRefreshButton = this.meetingsLoadError.getByTestId('do-refresh-meetings');
  }

  async openMeetingsTab(): Promise<void> {
    if ((await this.meetingsTab.getAttribute('aria-selected')) === 'true') {
      return;
    }

    await this.meetingsTab.click();
    await expect(this.meetingsTab).toHaveAttribute('aria-selected', 'true');
  }

  async retryLoadingMeetings(): Promise<void> {
    await this.meetingsRefreshButton.click();
  }

  async openScheduleMeetingModal(): Promise<void> {
    if (await this.emptyMeetingsList.isVisible()) {
      await this.emptyMeetingsList.getByTestId('schedule-meeting').click();
      return;
    }

    await this.scheduleMeetingButton.click();
  }

  async scheduleMeetingOnDate(
    title: string,
    dateLabel: string,
    startTimeLabel: string,
    endTimeLabel: string,
    options: {
      recurrence?: ScheduleMeetingRecurrenceLabel;
      participantNames?: string[];
    } = {},
  ): Promise<void> {
    await this.openScheduleMeetingModal();
    await this.fillMeetingTitle(title);
    await this.selectRecurrence(options.recurrence ?? 'Never');

    for (const name of options.participantNames ?? []) {
      await this.addParticipant(name);
    }

    await this.selectMeetingDate(dateLabel);
    await this.selectTimeForGroup('Starts', startTimeLabel);
    await this.selectTimeForGroup('Ends', endTimeLabel);

    // Preserve the requested date and time.
    await this.scheduleMeetingSubmitButton.click();
    await expect(this.scheduleMeetingModal).toBeHidden({timeout: MEETINGS_LIST_TIMEOUT_MS});
  }

  async readMeetingTimeline(
    meetingCount: number,
    previousRows: MeetingTimelineRow[] = [],
  ): Promise<MeetingTimelineRow[]> {
    const scrollContainer = this.meetingsList.locator('..');

    await expect(this.meetingsList).toBeVisible();
    if (previousRows.length === 0) {
      await scrollContainer.evaluate(element => {
        element.scrollTop = 0;
      });
      await expect(this.meetingsList.locator('[data-index]').first()).toHaveAttribute('data-index', '0');
    }

    const collectedRows = new Map(
      previousRows.map(row => {
        return [row.index, row];
      }),
    );

    await expect
      .poll(
        async () => {
          const rows = await this.meetingsList.locator('[data-index]').evaluateAll(elements => {
            return elements.flatMap<MeetingTimelineRow>(element => {
              const index = Number(element.getAttribute('data-index'));
              const heading = element.querySelector('[role="heading"]');

              if (heading !== null) {
                return [
                  {
                    index,
                    kind: 'day',
                    dayHeading: heading.textContent?.trim() ?? '',
                    title: '',
                    text: '',
                  },
                ];
              }

              const meeting = element.querySelector('[data-uie-name="item-meeting"]');

              if (meeting === null) {
                return [];
              }

              const description = element.querySelector('span[id^="meeting-day-description-"]');

              return [
                {
                  index,
                  kind: 'meeting',
                  dayHeading: description?.textContent?.trim() ?? '',
                  title: meeting.getAttribute('data-uie-value') ?? '',
                  text: (meeting.textContent ?? '').replace(/\s+/g, ' ').trim(),
                },
              ];
            });
          });

          for (const row of rows) {
            collectedRows.set(row.index, row);
          }

          const count = [...collectedRows.values()].filter(row => {
            return row.kind === 'meeting';
          }).length;
          if (count < meetingCount) {
            await scrollContainer.evaluate(element => {
              element.scrollTop += element.clientHeight / 2;
            });
          }

          return count;
        },
        {
          timeout: MEETINGS_LIST_TIMEOUT_MS,
          intervals: [100, 200, 300],
        },
      )
      .toBeGreaterThanOrEqual(meetingCount);

    const orderedRows = [...collectedRows.values()].sort((first, second) => {
      return first.index - second.index;
    });
    const meetings = orderedRows.filter(row => {
      return row.kind === 'meeting';
    });
    const lastIndex = meetings[meetingCount - 1].index;

    return orderedRows.filter(row => {
      return row.index <= lastIndex;
    });
  }

  async readFirstMeetingOccurrences(title: string, count: number): Promise<MeetingOccurrenceSnapshot[]> {
    const scrollContainer = this.meetingsList.locator('..');
    await expect(this.meetingsList).toBeVisible();

    await scrollContainer.evaluate(element => {
      element.scrollTop = 0;
    });
    const occurrences = new Map<number, {dayHeading: string; text: string}>();

    await expect
      .poll(
        async () => {
          const renderedOccurrences = await this.meetingsList
            .locator('[data-index]')
            .evaluateAll((rows, meetingTitle) => {
              return rows.flatMap(row => {
                const meeting = row.querySelector('[data-uie-name="item-meeting"]');

                if (meeting === null || meeting.getAttribute('data-uie-value') !== meetingTitle) {
                  return [];
                }

                const description = row.querySelector('span[id^="meeting-day-description-"]');

                return [
                  {
                    index: Number(row.getAttribute('data-index')),
                    dayHeading: description?.textContent?.trim() ?? '',
                    text: (meeting.textContent ?? '').replace(/\s+/g, ' ').trim(),
                  },
                ];
              });
            }, title);

          for (const occurrence of renderedOccurrences) {
            occurrences.set(occurrence.index, {dayHeading: occurrence.dayHeading, text: occurrence.text});
          }

          if (occurrences.size < count) {
            await scrollContainer.evaluate(element => {
              element.scrollTop += element.clientHeight / 2;
            });
          }

          return occurrences.size;
        },
        {timeout: MEETINGS_LIST_TIMEOUT_MS},
      )
      .toBeGreaterThanOrEqual(count);

    return [...occurrences.entries()]
      .sort(([firstIndex], [secondIndex]) => {
        return firstIndex - secondIndex;
      })
      .slice(0, count)
      .map(([, occurrence]) => {
        return occurrence;
      });
  }

  async selectMeetingDate(dateLabel: string): Promise<void> {
    await this.startDateOpenCalendarButton().click();

    // Wait until the calendar is displayed before inspecting its dates.
    const calendar = this.page
      .getByRole('dialog')
      .filter({has: this.page.getByRole('button', {name: 'Next month', exact: true})});

    await expect(calendar.getByRole('grid')).toBeVisible();

    // Allow additional accessible text, such as a selected-date annotation.
    const dateButton = calendar.getByRole('button', {name: dateLabel, exact: false});

    // This scenario only uses tomorrow and the following day.
    if (!(await dateButton.isVisible())) {
      await calendar.getByRole('button', {name: 'Next month', exact: true}).click();
    }

    await expect(dateButton).toBeVisible();
    await dateButton.click();
  }

  async openMeetingsAt(time: Date): Promise<void> {
    await this.page.clock.setFixedTime(time.getTime());
    await this.page.reload();

    await expect(this.meetingsTab).toBeVisible({
      timeout: MEETINGS_LIST_TIMEOUT_MS,
    });

    await this.openMeetingsTab();

    await expect(this.meetingsTab).toHaveAttribute('aria-selected', 'true');
  }

  async getLocalTimeZone(): Promise<string> {
    return this.page.evaluate(() => {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    });
  }

  meetingOccurrence(title: string, dayHeading: string): Locator {
    const dayDescription = this.page
      .getByText(dayHeading, {exact: true})
      .and(this.page.locator('span[id^="meeting-day-description-"]'));

    // Each virtualized row contains its own day description.
    return this.meetingsList
      .locator('[data-index]')
      .filter({has: dayDescription})
      .getByTestId('item-meeting')
      .filter({
        has: this.page.getByText(title, {exact: true}),
      });
  }

  participantAvatars(meeting: Locator): Locator {
    return meeting.getByTestId('meeting-participants-avatars').getByTestId('element-avatar-user');
  }

  participantOverflow(meeting: Locator): Locator {
    return meeting.getByTestId('meeting-participants-avatars').getByText(/^\+\d+$/, {exact: true});
  }

  participantInitials(avatar: Locator): Locator {
    return avatar.getByTestId('element-avatar-initials');
  }

  participantImage(avatar: Locator): Locator {
    return avatar.locator('img[src]:not([src=""])');
  }

  meetingTitle(meeting: Locator, title: string): Locator {
    return meeting.getByText(title, {exact: true});
  }

  meetingRepeatLabel(meeting: Locator, label: string): Locator {
    return meeting.getByText(label, {exact: true});
  }

  async hoverParticipantAvatar(avatar: Locator): Promise<void> {
    await avatar.hover();
  }

  editMeetingMenuAction(menu: Locator): Locator {
    return menu.getByRole('button', {
      name: 'Edit meeting',
      exact: true,
    });
  }

  deleteMeetingForEveryoneMenuAction(menu: Locator): Locator {
    return menu.getByRole('button', {
      name: 'Delete meeting for everyone',
      exact: true,
    });
  }

  async openStartDateCalendar(): Promise<void> {
    await this.startDateOpenCalendarButton().click();
  }

  calendarDateButton(dateLabel: string): Locator {
    const calendar = this.page.getByRole('dialog').filter({
      has: this.page.getByRole('button', {
        name: 'Next month',
        exact: true,
      }),
    });

    return calendar.getByRole('button', {
      name: dateLabel,
      exact: false,
    });
  }

  async isParticipantImageLoaded(avatar: Locator): Promise<boolean> {
    return this.participantImage(avatar).evaluateAll(images => {
      return (
        images.length === 1 &&
        images.every(image => {
          const picture = image as HTMLImageElement;
          return picture.complete && picture.naturalWidth > 0;
        })
      );
    });
  }

  participantTooltip(label: string): Locator {
    return this.page.getByRole('tooltip', {
      name: label,
      exact: true,
    });
  }

  async joinMeetingFromPrep(): Promise<void> {
    await this.meetingPrepModal.getByRole('button', {name: 'Join', exact: true}).click();
    await expect(this.meetingPrepModal).toBeHidden();
  }

  meetingAttendingStatus(meeting: Locator): Locator {
    return meeting.getByText('Attending', {exact: true});
  }

  async closeMeetingContextMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async movePointerAwayFromParticipants(): Promise<void> {
    await this.meetingsTab.hover();
  }

  async openMeetNowModal(): Promise<void> {
    await this.openMeetingsTab();
    await this.meetNowButton.click();
    await expect(this.meetNowModal).toBeVisible();
  }

  async addMeetNowParticipant(fullName: string): Promise<void> {
    const participantsInput = this.meetNowModal.getByTestId('meet-now-participants').locator('input');
    const participantOption = this.page.getByTestId('item-user').filter({hasText: fullName});

    await participantsInput.fill(fullName);
    const contactsToggle = this.page.getByTestId('do-toggle-search-list');
    if ((await contactsToggle.getAttribute('aria-expanded')) !== 'true') {
      await contactsToggle.click();
    }
    await expect(participantOption).toBeVisible();
    await participantOption.click();
  }

  async startMeetNow(title: string, participantNames: string[]): Promise<void> {
    await this.openMeetNowModal();
    await this.meetNowModal.getByTestId('meet-now-title').fill(title);

    for (const participantName of participantNames) {
      await this.addMeetNowParticipant(participantName);
    }

    await this.meetNowModal.getByRole('button', {name: 'Start meeting'}).click();
    await expect(this.meetNowModal).toBeHidden();
  }

  meetingListItem(title: string): Locator {
    return this.meetingsList.locator(`[data-uie-name="item-meeting"][data-uie-value="${title}"]`);
  }

  async waitForMeetingInList(title: string, minimumCount = 1): Promise<void> {
    await this.openMeetingsTab();
    await expect
      .poll(
        () => {
          return this.meetingListItem(title).count();
        },
        {timeout: MEETINGS_LIST_TIMEOUT_MS},
      )
      .toBeGreaterThanOrEqual(minimumCount);
  }

  async waitForMeetingAbsentFromList(title: string): Promise<void> {
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

  async assertNoSubmitErrorVisible(): Promise<void> {
    await expect(
      this.page.getByText('The meeting was updated, but some participants could not be removed'),
    ).toBeHidden();
  }

  meetingTitleInput(): Locator {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-title');
  }

  async fillMeetingTitle(title: string): Promise<void> {
    const titleInput = this.meetingTitleInput();
    await titleInput.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
  }

  async dismissBlockingModals(): Promise<void> {
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

  async closeParticipantsPicker(): Promise<void> {
    const dropdown = this.page.getByTestId('dropdown-schedule-meeting-participants');
    if (!(await dropdown.isVisible())) {
      return;
    }

    await this.meetingTitleInput().click();
    await expect(dropdown).toBeHidden();
  }

  async addParticipant(fullName: string): Promise<void> {
    const participants = this.scheduleMeetingModal.getByTestId('schedule-meeting-participants');
    const dropdown = this.page.getByTestId('dropdown-schedule-meeting-participants');
    const participantOption = dropdown.getByTestId('item-user').filter({hasText: fullName});

    await participants.getByTestId('schedule-meeting-participants-input').fill(fullName);
    const contactsToggle = dropdown.getByTestId('do-toggle-search-list');
    if ((await contactsToggle.getAttribute('aria-expanded')) !== 'true') {
      await contactsToggle.click();
    }
    await expect(participantOption).toBeVisible();
    await participantOption.click();
    await this.closeParticipantsPicker();
  }

  async openParticipantsPicker(): Promise<Locator> {
    const participants = this.scheduleMeetingModal.getByTestId('schedule-meeting-participants');
    const dropdown = this.page.getByTestId('dropdown-schedule-meeting-participants');

    if (!(await dropdown.isVisible())) {
      await participants.getByTestId('schedule-meeting-participants-toggle').click();
    }

    await expect(dropdown).toBeVisible();
    return dropdown;
  }

  async removeParticipant(fullName: string): Promise<void> {
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

  startDateOpenCalendarButton(): Locator {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-date').getByRole('button', {name: 'Open calendar'});
  }

  scheduleMeetingForm(): Locator {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-form');
  }

  async scheduleMeetingModalMode(): Promise<ScheduleMeetingModalMode> {
    const mode = await this.scheduleMeetingForm().getAttribute('data-uie-mode');
    if (mode === 'create' || mode === 'edit') {
      return mode;
    }

    throw new Error(`Unexpected schedule meeting modal mode: ${mode ?? 'missing'}`);
  }

  startDateInput(): Locator {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-date').locator('input[type="text"]');
  }

  recurrenceSelect(): Locator {
    return this.scheduleMeetingModal.getByTestId('schedule-meeting-recurrence');
  }

  async selectRecurrence(label: ScheduleMeetingRecurrenceLabel): Promise<void> {
    const recurrence = this.recurrenceSelect();
    await recurrence.scrollIntoViewIfNeeded();
    await recurrence.click();
    await this.page.getByRole('option', {name: label}).click();
  }

  private timePicker(groupName: 'Starts' | 'Ends'): Locator {
    const dataUieName = groupName === 'Starts' ? 'schedule-meeting-start-time' : 'schedule-meeting-end-time';
    return this.scheduleMeetingModal.locator(`[data-uie-name="${dataUieName}"] [data-uie-name="${dataUieName}"]`);
  }

  async selectTimeForGroup(groupName: 'Starts' | 'Ends', timeLabel: string): Promise<void> {
    const timePicker = this.timePicker(groupName);
    await timePicker.scrollIntoViewIfNeeded();
    await timePicker.click();
    await this.page.getByRole('option', {name: timeLabel, exact: true}).click();
  }

  async selectLatestAvailableStartTime(): Promise<void> {
    const startTimeCombobox = this.timePicker('Starts');
    await startTimeCombobox.scrollIntoViewIfNeeded();
    await startTimeCombobox.click();
    const startTimeOptions = this.page.getByRole('option');
    const optionCount = await startTimeOptions.count();
    await startTimeOptions.nth(Math.min(1, optionCount - 1)).click();
  }

  async setMeetingStartDate(date: Date): Promise<void> {
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

  async setMeetingStartDateToTomorrow(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.setMeetingStartDate(tomorrow);
  }

  async setMeetingTimes(start: Date, end: Date): Promise<void> {
    const mode = await this.scheduleMeetingModalMode();
    if (mode === 'create') {
      await this.setMeetingStartDate(start);
    }

    await this.selectTimeForGroup('Starts', formatMeetingTimeLabel(start));
    await this.selectTimeForGroup('Ends', formatMeetingTimeLabel(end));
  }

  async fixStartTimeInPastValidationError(): Promise<void> {
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

  startInPastError(): Locator {
    return this.scheduleMeetingModal.getByText('Start time must be in the future');
  }

  async submitScheduleMeetingModal(options: {expectSuccess?: boolean} = {}): Promise<void> {
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
  ): Promise<void> {
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

  async fillScheduleMeetingPassword(password: string): Promise<void> {
    await this.scheduleMeetingModal.getByTestId('guest-link-password').fill(password);
    await this.scheduleMeetingModal.getByTestId('guest-link-password-confirm').fill(password);
  }

  meetingCreateRequest(): Promise<Request> {
    return this.page.waitForRequest(request => {
      const url = new URL(request.url());
      return request.method() === 'POST' && /\/meetings$/.test(url.pathname);
    });
  }

  async assertMeetingCreateRequest(
    requestPromise: ReturnType<Page['waitForRequest']>,
    password: string,
  ): Promise<void> {
    const request = await requestPromise;
    expect(request.method()).toBe('POST');
    expect(new URL(request.url()).pathname).toMatch(/\/meetings$/);
    const postData = request.postDataBuffer();
    const body = postData === null ? {} : parseRequestBody(postData);
    expect(body).toEqual(expect.objectContaining({password, type: 'scheduled'}));
  }

  async openEditMeetingModal(title: string, occurrenceIndex = 0): Promise<void> {
    const menu = await this.openMeetingContextMenu(title, occurrenceIndex);
    await this.editMeetingMenuAction(menu).click();
    await expect(this.scheduleMeetingModal).toBeVisible();
    await expect(this.scheduleMeetingForm()).toHaveAttribute('data-uie-mode', 'edit');
  }

  async expectEditMeetingActionVisible(title: string, visible: boolean): Promise<void> {
    const menu = await this.openMeetingContextMenu(title);
    const editAction = this.editMeetingMenuAction(menu);

    if (visible) {
      await expect(editAction).toBeVisible();
    } else {
      await expect(editAction).toBeHidden();
    }

    await this.page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }

  async expectEditPrefillDateIsToday(): Promise<void> {
    const today = formatMeetingDateIso(new Date());
    await expect(this.startDateInput()).toHaveValue(today);
  }

  async configureOngoingMeetingTimes(): Promise<void> {
    const {start, end} = createOngoingMeetingWindow();
    await this.setMeetingTimes(start, end);
  }

  async configureEndedMeetingTimes(): Promise<void> {
    const {start, end} = createEndedMeetingWindow();
    await this.setMeetingTimes(start, end);
  }

  async openMeetingContextMenu(title: string, occurrenceIndex = 0): Promise<Locator> {
    await this.openMeetingsTab();
    await this.dismissBlockingModals();
    const meetingItem = this.meetingListItem(title).nth(occurrenceIndex);
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
      occurrenceIndex?: number;
      dateLabel?: string;
    },
  ): Promise<void> {
    await this.openEditMeetingModal(title, updates.occurrenceIndex ?? 0);
    await expect(this.meetingTitleInput()).toHaveValue(title);

    if (updates.newTitle !== undefined) {
      await this.fillMeetingTitle(updates.newTitle);
    }

    if (updates.dateLabel !== undefined) {
      await this.selectMeetingDate(updates.dateLabel);
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

  async deleteMeetingForAll(title: string): Promise<void> {
    const menu = await this.openMeetingContextMenu(title);
    await this.deleteMeetingForEveryoneMenuAction(menu).click();

    const confirmModal = new ConfirmModal(this.page);
    await confirmModal.clickAction();
  }

  async deleteMeetingForMe(title: string): Promise<void> {
    const menu = await this.openMeetingContextMenu(title);
    await menu.getByRole('button', {name: 'Delete meeting for me'}).click();

    const confirmModal = new ConfirmModal(this.page);
    await confirmModal.clickAction();
  }

  async expandNotifications(): Promise<void> {
    const expandButton = this.notificationHost.getByTestId('meeting-notification-expand');
    if ((await expandButton.getAttribute('aria-expanded')) !== 'true') {
      await expandButton.click();
    }
  }

  notificationCards(): Locator {
    return this.notificationHost.locator('[data-uie-name^="meeting-notification-card-"]');
  }

  async waitForNotificationHost(): Promise<void> {
    await expect
      .poll(
        () => {
          return this.notificationHost.count();
        },
        {timeout: MEETINGS_LIST_TIMEOUT_MS},
      )
      .toBe(1);
    await expect(this.notificationHost).toBeVisible();
  }

  notificationCardContaining(text: string): Locator {
    return this.notificationCards().filter({hasText: text});
  }

  async waitForNotificationContaining(text: string): Promise<void> {
    await this.waitForNotificationHost();
    await this.expandNotifications();
    await expect(this.notificationCardContaining(text)).toBeVisible({timeout: MEETINGS_LIST_TIMEOUT_MS});
  }

  async expectNoNotificationContaining(text: string): Promise<void> {
    await expect(this.notificationCardContaining(text)).toHaveCount(0, {timeout: MEETINGS_LIST_TIMEOUT_MS});
  }
}

const parseRequestBody = (postData: Buffer): Record<string, string> => {
  try {
    return JSON.parse(postData.toString('utf8')) as Record<string, string>;
  } catch {
    return JSON.parse(gunzipSync(postData).toString('utf8')) as Record<string, string>;
  }
};
