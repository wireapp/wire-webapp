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

import {PageManager} from '../../pageManager';
import {expect, test} from '../../test.fixtures';
import {
  createMeetingDetailsData,
  createOngoingMeetingWindow,
  meetingWindowWithinPastEditPeriod,
  createMidnightMeetingTimes,
  createOrderedMeetingListData,
  createScheduleMeetingDefaultsData,
  createPastMeetingSelectionData,
} from '../../utils/meetingTime.util';
import {prepareMeetingParticipantProfiles} from '../../utils/meetingSetup.util';
import {createMeetingsTeam, loginMeetingsUsers} from '../../utils/meetings.util';
import {getImageFilePath} from '../../utils/sendImage.util';
import {holdMeetingCreationRequest} from '../../utils/meetingRequest.util';

const MEETING_TITLE = 'Team sync';
const SUPPORTED_MEETING_TITLE = `${MEETING_TITLE} – QA & Dev 🚀`;
const UPDATED_MEETING_TITLE = 'Updated team sync';
const LARGE_MEETING_TITLE = 'Large meeting';
const DAILY_ONGOING_TITLE = 'Daily ongoing edit e2e';
const SINGLE_ONGOING_TITLE = 'Single ongoing edit e2e';
const ENDED_MEETING_TITLE = 'Ended meeting edit e2e';
const UPDATED_DAILY_TITLE = 'Daily ongoing edit updated';
const LONG_NAME = 'Alexandria-Marie O’Connor-Sørensen';
const ORDERING_OCCURRENCE_COUNT = 53;
const RECURRENCE_SCENARIOS = [
  {testCaseId: '11699', label: 'Never', intervalDays: 0},
  {testCaseId: '11649', label: 'Daily', intervalDays: 1},
  {testCaseId: '13604', label: 'Weekly', intervalDays: 7},
  {testCaseId: '13605', label: 'Every two weeks', intervalDays: 14},
  {testCaseId: '13606', label: 'Every four weeks', intervalDays: 28},
] as const;
const LATE_MEETING_SCENARIOS = [
  {
    title: `${MEETING_TITLE} – 23:15`,
    startLabels: ['11:00 PM', '11:15 PM'],
    timeRange: '11:15 - 11:45 PM',
  },
  {
    title: `${MEETING_TITLE} – 23:30`,
    startLabels: ['11:30 PM'],
    timeRange: '11:30 - 11:45 PM',
  },
] as const;

test.describe('Meetings', () => {
  test.describe('Meeting List', () => {
    test(
      'TC-11643: User can view the empty Meetings list and creation options',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        await meetings.openMeetingsTab();
        await expect(meetings.meetingsTab).toHaveAttribute('aria-selected', 'true');
        await expect(meetings.emptyMeetingsTitle).toHaveText('No meetings yet.');
        await expect(meetings.emptyMeetingsDescription).toHaveText(
          'Start a meeting with team members. Your communication is always end-to-end encrypted, offering the highest level of security.',
        );
        await expect(meetings.emptyScheduleMeetingButton).toBeVisible();
        await expect(meetings.emptyScheduleMeetingButton).toBeEnabled();
        // Assert: there are no meeting entries.
        await expect(meetings.meetingEntries).toHaveCount(0);
      },
    );

    test(
      'TC-11653 , TC-11741: User can view meeting details and participant information',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner, members} = await createMeetingsTeam(createUser, createTeam, 4);
        const member = members[0];
        const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, ...members]);

        const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
        const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

        await prepareMeetingParticipantProfiles(ownerPage, memberPage, member, {
          profileImagePath: getImageFilePath(),
          longName: LONG_NAME,
        });
        await ownerMeetings.openMeetingsTab();
        const details = createMeetingDetailsData(new Date(), await ownerMeetings.getLocalTimeZone());

        await ownerMeetings.scheduleMeetingOnDate(
          MEETING_TITLE,
          details.dateLabel,
          details.startLabel,
          details.endLabel,
          {
            recurrence: 'Daily',
            participantNames: members.map(user => {
              return user.fullName;
            }),
          },
        );

        await memberMeetings.openMeetingsTab();
        const meeting = memberMeetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);

        // Verify the intended occurrence and saved details.
        await expect(meeting).toHaveCount(1);
        await expect(memberMeetings.meetingTitle(meeting, MEETING_TITLE)).toBeVisible();
        await expect(meeting).toContainText(details.timeRange);
        await expect(memberMeetings.meetingRepeatLabel(meeting, 'Daily')).toBeVisible();

        const avatars = memberMeetings.participantAvatars(meeting);

        // Verify avatar count, overflow, and the two defined positions.
        await expect(avatars).toHaveCount(4);
        await expect(memberMeetings.participantOverflow(meeting)).toHaveText('+1');

        const organizerAvatar = avatars.nth(0);
        const selfAvatar = avatars.nth(1);
        const organizerLabel = `${owner.fullName} (Organizer)`;

        await expect(organizerAvatar).toHaveAttribute('aria-label', organizerLabel);
        await expect(selfAvatar).toHaveAttribute('aria-label', LONG_NAME);

        // The organizer's image is present and successfully loaded.
        await expect(memberMeetings.participantImage(organizerAvatar)).toBeVisible();
        await expect
          .poll(() => {
            return memberMeetings.isParticipantImageLoaded(organizerAvatar);
          })
          .toBe(true);

        // Small meeting avatars display one initial.
        await expect(memberMeetings.participantInitials(selfAvatar)).toBeVisible();
        await expect(memberMeetings.participantInitials(selfAvatar)).toHaveText('A');
        await expect(memberMeetings.participantImage(selfAvatar)).toHaveCount(0);

        // Tooltips appear on hover and disappear afterward.
        await expect(organizerAvatar).toHaveAttribute('aria-label', organizerLabel);
        const organizerTooltip = memberMeetings.participantTooltip(organizerLabel);
        const memberTooltip = memberMeetings.participantTooltip(LONG_NAME);

        // No participant tooltip before hovering.
        await memberMeetings.movePointerAwayFromParticipants();
        await expect(organizerTooltip).toBeHidden();
        await expect(memberTooltip).toBeHidden();

        // Organizer tooltip.
        await memberMeetings.hoverParticipantAvatar(organizerAvatar);

        await expect(organizerTooltip).toBeVisible();
        await expect(organizerTooltip).toHaveText(organizerLabel);

        await memberMeetings.movePointerAwayFromParticipants();
        await expect(organizerTooltip).toBeHidden();

        // Long-name member tooltip.
        await memberMeetings.hoverParticipantAvatar(selfAvatar);

        await expect(memberTooltip).toBeVisible();
        await expect(memberTooltip).toHaveText(LONG_NAME);
        await expect(organizerTooltip).toBeHidden();

        await memberMeetings.movePointerAwayFromParticipants();
        await expect(memberTooltip).toBeHidden();
      },
    );

    test(
      'TC-11654: Host can view list updates after creating editing and deleting a meeting',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        await meetings.openMeetingsTab();
        const timeZone = await meetings.getLocalTimeZone();
        const referenceDate = new Date();

        const original = createMeetingDetailsData(referenceDate, timeZone);
        const updated = createMeetingDetailsData(referenceDate, timeZone, 2);

        // Create: the new meeting appears under tomorrow without refreshing.
        await meetings.scheduleMeetingOnDate(MEETING_TITLE, original.dateLabel, original.startLabel, original.endLabel);
        const originalMeeting = meetings.meetingOccurrence(MEETING_TITLE, original.dayHeading);
        await expect(originalMeeting).toHaveCount(1);
        await expect(originalMeeting).toBeVisible();

        // Edit: the renamed meeting moves to its new day.
        await meetings.editMeeting(MEETING_TITLE, {newTitle: UPDATED_MEETING_TITLE, dateLabel: updated.dateLabel});
        const updatedMeeting = meetings.meetingOccurrence(UPDATED_MEETING_TITLE, updated.dayHeading);

        await expect(updatedMeeting).toHaveCount(1);
        await expect(updatedMeeting).toBeVisible();
        await expect(meetings.meetingListItem(MEETING_TITLE)).toHaveCount(0);

        // Delete: the meeting disappears without refreshing.
        await meetings.deleteMeetingForAll(UPDATED_MEETING_TITLE);

        await expect(meetings.meetingListItem(UPDATED_MEETING_TITLE)).toHaveCount(0);
        await expect(meetings.meetingListItem(MEETING_TITLE)).toHaveCount(0);
        await expect(meetings.meetingEntries).toHaveCount(0);
        await expect(meetings.emptyMeetingsTitle).toHaveText('No meetings yet.');
      },
    );

    test(
      'TC-11657 , TC-11658 :Participant can view invited meetings and removal updates and Host can refresh the meeting without loosing data',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
        const member = members[0];

        const [ownerPage, memberPage] = await loginMeetingsUsers(createPage, [owner, member]);

        const ownerMeetings = PageManager.from(ownerPage).webapp.pages.meetings();
        const memberMeetings = PageManager.from(memberPage).webapp.pages.meetings();

        // Host schedules a one-off meeting and invites the participant.
        await ownerMeetings.openMeetingsTab();

        const details = createMeetingDetailsData(new Date(), await ownerMeetings.getLocalTimeZone());

        await ownerMeetings.scheduleMeetingOnDate(
          MEETING_TITLE,
          details.dateLabel,
          details.startLabel,
          details.endLabel,
          {participantNames: [member.fullName]},
        );

        // Both users see the same saved title, day, and time.
        const hostMeeting = ownerMeetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);
        await ownerPage.reload();

        await expect(hostMeeting).toHaveCount(1);
        await expect(hostMeeting).toBeVisible();
        await expect(hostMeeting).toContainText(details.timeRange);

        await memberMeetings.openMeetingsTab();

        const invitedMeeting = memberMeetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);

        await expect(invitedMeeting).toHaveCount(1);
        await expect(invitedMeeting).toBeVisible();
        await expect(invitedMeeting).toContainText(details.timeRange);

        // Participant stays on Meetings while the host removes them.
        await ownerMeetings.editMeeting(MEETING_TITLE, {removeParticipants: [member.fullName]});

        // Synchronization removes the entry without a participant refresh.
        await expect(memberMeetings.meetingListItem(MEETING_TITLE)).toHaveCount(0);

        await expect(memberMeetings.meetingEntries).toHaveCount(0);
        await expect(memberMeetings.emptyMeetingsTitle).toBeVisible();
        await expect(memberMeetings.emptyMeetingsTitle).toHaveText('No meetings yet.');
      },
    );

    test(
      'TC-11740 : Host can view an ongoing Meet Now meeting',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);

        const ownerPages = PageManager.from(ownerPage).webapp.pages;
        const meetings = ownerPages.meetings();
        const calling = ownerPages.calling();

        await meetings.openMeetingsTab();
        const details = createMeetingDetailsData(new Date(), await meetings.getLocalTimeZone(), 0);

        let testFailed = false;
        try {
          // Create Meet Now and join through the preparation dialog.
          await meetings.startMeetNow(MEETING_TITLE, []);

          await expect(meetings.meetingPrepModal).toBeVisible();
          await meetings.joinMeetingFromPrep();

          await expect(calling.callCell).toBeVisible();

          // View Meetings while keeping the call active.
          await calling.minimizeCall();
          await meetings.openMeetingsTab();

          const meeting = meetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);

          await expect(meeting).toHaveCount(1);
          await expect(meeting).toBeVisible();
          await expect(meetings.meetingAttendingStatus(meeting)).toBeVisible();

          // Check the host's available actions without selecting them.
          const menu = await meetings.openMeetingContextMenu(MEETING_TITLE);

          await expect(meetings.editMeetingMenuAction(menu)).toBeVisible();
          await expect(meetings.deleteMeetingForEveryoneMenuAction(menu)).toBeVisible();
        } catch (error) {
          testFailed = true;
          throw error;
        } finally {
          try {
            try {
              await meetings.closeMeetingContextMenu();
            } finally {
              try {
                await calling.minimizeCall({timeout: 2000});
              } finally {
                if (await calling.leaveCallButton.isVisible()) {
                  await calling.clickLeaveCallButton({timeout: 2000});
                }

                await expect(calling.callCell).toBeHidden({timeout: 2000});
              }
            }
          } catch (cleanupError) {
            if (!testFailed) {
              throw cleanupError;
            }

            console.warn('Meet Now cleanup also failed:', cleanupError);
          }
        }
      },
    );

    test(
      'TC-11661: User can view two separate meetings with identical details',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner, members} = await createMeetingsTeam(createUser, createTeam, 1);
        const member = members[0];

        // Both users log in to initialize their MLS clients.
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner, member]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();
        await meetings.openMeetingsTab();
        const details = createMeetingDetailsData(new Date(), await meetings.getLocalTimeZone());

        // Create two separate meetings with identical details.
        for (let index = 0; index < 2; index++) {
          await meetings.scheduleMeetingOnDate(MEETING_TITLE, details.dateLabel, details.startLabel, details.endLabel, {
            participantNames: [member.fullName],
          });
        }

        const identicalMeetings = meetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);

        // Both meetings appear separately under the expected day.
        await expect(identicalMeetings).toHaveCount(2);
        await expect(meetings.meetingEntries).toHaveCount(2);

        for (let index = 0; index < 2; index++) {
          const meeting = identicalMeetings.nth(index);

          await expect(meeting).toBeVisible();
          await expect(meeting).toContainText(details.timeRange);
        }
      },
    );

    test(
      'TC-11648: User can view completed meetings until local midnight',
      {tag: ['@regression']},

      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        await meetings.openMeetingsTab();
        const times = createMidnightMeetingTimes(new Date(), await meetings.getLocalTimeZone());

        // Schedule tomorrow's meeting from 09:00 to 10:00.
        await meetings.scheduleMeetingOnDate(MEETING_TITLE, times.dateLabel, times.startLabel, times.endLabel);

        // At 11:00 on the meeting day, it has ended but remains under Today.
        await meetings.openMeetingsAt(times.afterMeetingEnds);

        const completedMeeting = meetings.meetingOccurrence(MEETING_TITLE, times.todayHeading);

        await expect(completedMeeting).toHaveCount(1);
        await expect(completedMeeting).toBeVisible();
        await expect(meetings.meetingEntries).toHaveCount(1);

        // It remains visible immediately before local midnight.
        await meetings.openMeetingsAt(times.beforeMidnight);

        await expect(completedMeeting).toHaveCount(1);
        await expect(completedMeeting).toBeVisible();
        await expect(meetings.meetingEntries).toHaveCount(1);

        // At the following local midnight, refresh and check removal.
        await meetings.openMeetingsAt(times.midnight);

        await expect(meetings.meetingListItem(MEETING_TITLE)).toHaveCount(0);

        await expect(meetings.meetingEntries).toHaveCount(0);
        await expect(meetings.emptyMeetingsTitle).toBeVisible();
        await expect(meetings.emptyMeetingsTitle).toHaveText('No meetings yet.');
      },
    );

    for (const scenario of RECURRENCE_SCENARIOS) {
      test(
        `TC-${scenario.testCaseId}: Host can schedule and view a meeting with Repeat set to : ${scenario.label}`,
        {tag: ['@regression']},
        async ({createUser, createTeam, createPage}) => {
          const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
          const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
          const meetings = PageManager.from(ownerPage).webapp.pages.meetings();
          await meetings.openMeetingsTab();

          const timeZone = await meetings.getLocalTimeZone();
          const referenceDate = new Date();
          const occurrenceCount = scenario.label === 'Never' ? 1 : 3;

          // All expected dates use the same starting instant.
          const expectedOccurrences = Array.from({length: occurrenceCount}, (_, index) => {
            return createMeetingDetailsData(referenceDate, timeZone, 1 + index * scenario.intervalDays);
          });

          const first = expectedOccurrences[0];

          await meetings.scheduleMeetingOnDate(MEETING_TITLE, first.dateLabel, first.startLabel, first.endLabel, {
            recurrence: scenario.label,
          });

          const actualOccurrences = await meetings.readFirstMeetingOccurrences(MEETING_TITLE, occurrenceCount);

          // The first three occurrences follow the selected repeat pattern.
          await expect(actualOccurrences).toHaveLength(occurrenceCount);
          expect(
            actualOccurrences.map(occurrence => {
              return occurrence.dayHeading;
            }),
          ).toEqual(
            expectedOccurrences.map(occurrence => {
              return occurrence.dayHeading;
            }),
          );

          // No repeated day among these three occurrences.
          expect(
            new Set(
              actualOccurrences.map(occurrence => {
                return occurrence.dayHeading;
              }),
            ).size,
          ).toBe(occurrenceCount);

          // Every inspected occurrence has the expected details and label.
          for (const occurrence of actualOccurrences) {
            expect(occurrence.text).toContain(MEETING_TITLE);
            expect(occurrence.text).toContain(first.timeRange);

            // Recurring meetings display their repeat label.
            if (scenario.label !== 'Never') {
              expect(occurrence.text).toContain(scenario.label);
            }
          }

          if (scenario.label === 'Never') {
            const meeting = meetings.meetingOccurrence(MEETING_TITLE, first.dayHeading);

            await expect(meeting).toBeVisible();
            await expect(meetings.meetingEntries).toHaveCount(1);
          }
        },
      );
    }

    test(
      'TC-11645 , TC-11650: User can view ordered meetings, load more, and retain ordering after refresh ',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        await meetings.openMeetingsTab();

        const data = createOrderedMeetingListData(
          new Date(),
          await meetings.getLocalTimeZone(),
          ORDERING_OCCURRENCE_COUNT,
          MEETING_TITLE,
        );
        for (const meeting of data.meetingsToCreate) {
          await meetings.scheduleMeetingOnDate(meeting.title, meeting.dateLabel, meeting.startLabel, meeting.endLabel, {
            recurrence: 'Weekly',
          });
        }

        await meetings.openMeetingsAt(data.observationTime);

        const stages = [
          {
            name: 'Initial list',
            count: 5,
            refresh: false,
            expectedTimeline: data.expectedInitialTimeline,
            expectedOccurrences: data.initialOccurrences,
          },
          {
            name: 'After loading more',
            count: ORDERING_OCCURRENCE_COUNT,
            refresh: false,
            expectedTimeline: data.expectedTimeline,
            expectedOccurrences: data.expectedOccurrences,
          },
          {
            name: 'After refresh',
            count: 5,
            refresh: true,
            expectedTimeline: data.expectedInitialTimeline,
            expectedOccurrences: data.initialOccurrences,
          },
        ];

        let timeline: Awaited<ReturnType<typeof meetings.readMeetingTimeline>> = [];

        for (const stage of stages) {
          if (stage.refresh) {
            await ownerPage.reload();
            await meetings.openMeetingsTab();
            timeline = [];
          }

          timeline = await meetings.readMeetingTimeline(stage.count, timeline);
          expect(
            timeline.map(({kind, dayHeading, title}) => {
              return {kind, dayHeading, title};
            }),
            `${stage.name}: grouping and ordering`,
          ).toEqual(stage.expectedTimeline);
          const entries = timeline.filter(row => {
            return row.kind === 'meeting';
          });
          expect(entries, `${stage.name}: entry count`).toHaveLength(stage.count);

          for (const [index, entry] of entries.entries()) {
            expect(entry.text, `${stage.name}: ${entry.title} time`).toContain(
              stage.expectedOccurrences[index].timeRange,
            );
            expect(entry.text, `${stage.name}: ${entry.title} repeat label`).toContain('Weekly');
          }
        }
      },
    );

    test(
      'TC-11659: User can recover Meetings after a network failure',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);

        const {pages, components} = PageManager.from(ownerPage).webapp;
        const meetings = pages.meetings();
        const sidebar = components.conversationSidebar();
        const context = ownerPage.context();

        await meetings.openMeetingsTab();

        const details = createMeetingDetailsData(new Date(), await meetings.getLocalTimeZone());

        // Establish that the saved meeting exists before the failure.
        await meetings.scheduleMeetingOnDate(MEETING_TITLE, details.dateLabel, details.startLabel, details.endLabel);

        const meeting = meetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);

        await expect(meeting).toHaveCount(1);
        await expect(meeting).toBeVisible();
        await expect(meeting).toContainText(details.timeRange);

        // Navigate away while online so reopening Meetings triggers loading.
        await sidebar.clickAllConversationsButton();
        await expect(meetings.meetingsTab).toHaveAttribute('aria-selected', 'false');

        try {
          // Disable networking only for this browser context.
          await context.setOffline(true);
          await meetings.openMeetingsTab();

          await expect(meetings.meetingsLoadError).toBeVisible();
          await expect(meetings.meetingsLoadErrorMessage).toHaveText('Could not load meetings. Please try again.');

          await expect(meetings.meetingsRefreshButton).toBeVisible();
          await expect(meetings.meetingsRefreshButton).toBeEnabled();

          // A failed load must not appear as an empty account.
          await expect(meetings.meetingEntries).toHaveCount(0);
          await expect(meetings.emptyMeetingsTitle).toBeHidden();

          // Restore networking and retry through the Meetings error state.
          await context.setOffline(false);
          await meetings.retryLoadingMeetings();

          await expect(meetings.meetingsLoadError).toBeHidden();
          await expect(meeting).toHaveCount(1);
          await expect(meeting).toBeVisible();
          await expect(meeting).toContainText(details.timeRange);
        } finally {
          // Restore networking even if an assertion fails.
          await context.setOffline(false);
        }
      },
    );
  });

  test.describe('Schedule', () => {
    test('creates a password-protected meeting join link', async ({createUser, createTeam, createPage}) => {
      const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
      const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
      const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

      await meetings.openMeetingsTab();
      await meetings.openScheduleMeetingModal();
      await meetings.fillMeetingTitle('Password-protected meeting');
      await meetings.fillScheduleMeetingPassword('MeetingSecret1!');

      const requestPromise = meetings.conversationCodeRequest();
      await meetings.submitScheduleMeetingModal();
      await meetings.assertConversationCodeRequest(requestPromise, 'MeetingSecret1!');
    });

    test(
      'TC-11686,TC-11687,TC-11688,TC-13063 : Host sees schedule defaults, title validation, and a meeting with a supported title and no other participants',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);

        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        const details = createScheduleMeetingDefaultsData(new Date(), await meetings.getLocalTimeZone());

        await meetings.openMeetingsAt(details.browserTime);
        await expect(meetings.emptyMeetingsTitle).toBeVisible();

        await meetings.openScheduleMeetingModal();

        // Verify the untouched modal and field defaults.
        await expect(meetings.scheduleMeetingModal).toBeVisible();
        await expect(meetings.scheduleMeetingHeading()).toBeVisible();

        await expect(meetings.meetingTitleInput()).toBeVisible();
        await expect(meetings.meetingTitleInput()).toHaveValue('');
        await expect(meetings.meetingTitleInput()).toHaveAttribute('placeholder', 'Enter a title');

        await expect(meetings.meetingParticipantsInput()).toBeVisible();
        await expect(meetings.meetingParticipantsInput()).toHaveValue('');
        await expect(meetings.meetingParticipantsInput()).toHaveAttribute('placeholder', 'Search by name');

        await expect(meetings.meetingDatePart('year')).toHaveAttribute('aria-valuenow', details.year);
        await expect(meetings.meetingDatePart('month')).toHaveAttribute('aria-valuenow', details.month);
        await expect(meetings.meetingDatePart('day')).toHaveAttribute('aria-valuenow', details.day);

        await expect(meetings.meetingTimeField('Starts')).toContainText(details.startLabel);

        await expect(meetings.meetingTimeField('Ends')).toContainText(details.endLabel);

        await expect(meetings.recurrenceSelect()).toBeVisible();
        await expect(meetings.recurrenceSelect()).toContainText('Never');
        await expect(meetings.scheduleMeetingSubmitButton).toBeEnabled();

        // An empty title prevents creation and keeps the modal open.
        await meetings.clickScheduleMeetingSubmit();

        await expect(meetings.meetingTitleRequiredError()).toHaveText('Title is required');
        await expect(meetings.scheduleMeetingModal).toBeVisible();
        await expect(meetings.meetingEntries).toHaveCount(0);

        // Enter a supported title and preserve all other default values.
        await meetings.fillMeetingTitle(SUPPORTED_MEETING_TITLE);

        await expect(meetings.meetingTitleInput()).toHaveValue(SUPPORTED_MEETING_TITLE);

        await meetings.clickScheduleMeetingSubmit();

        await expect(meetings.scheduleMeetingModal).toBeHidden();

        // Verify the saved meeting using existing Meeting List locators.
        const meeting = meetings.meetingOccurrence(SUPPORTED_MEETING_TITLE, details.dayHeading);

        await expect(meeting).toHaveCount(1);
        await expect(meeting).toBeVisible();
        await expect(meetings.meetingTitle(meeting, SUPPORTED_MEETING_TITLE)).toHaveText(SUPPORTED_MEETING_TITLE);
        await expect(meeting).toContainText(details.timeRange);

        // The host is the only participant and remains the organizer.
        const avatars = meetings.participantAvatars(meeting);
        const organizerLabel = `${owner.fullName} (Organizer)`;

        await expect(avatars).toHaveCount(1);
        await expect(avatars).toBeVisible();
        await expect(avatars).toHaveAttribute('aria-label', organizerLabel);
      },
    );

    test(
      'TC-13059: Invitee sees a meeting they were added to',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
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
      },
    );

    test(
      'TC-11693: Host cannot schedule a meeting in the past',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        const details = createPastMeetingSelectionData(new Date(), await meetings.getLocalTimeZone());

        await meetings.openMeetingsAt(details.browserTime);
        await meetings.openScheduleMeetingModal();

        await expect(meetings.scheduleMeetingModal).toBeVisible();

        // Past dates cannot be selected.
        await meetings.openStartDateCalendar();

        if (details.yesterdayInCurrentMonth) {
          await expect(meetings.calendarDateButton(details.yesterdayLabel)).toBeDisabled();
        } else {
          // On the first day of a month, the previous month is unavailable.
          await expect(meetings.calendarPreviousMonthButton()).toBeDisabled();
        }

        await meetings.closeStartDateCalendar();

        // Today must not offer any start time at or before 10:10 AM.
        await meetings.openMeetingTimeOptions('Starts');

        // Confirm the dropdown is open before checking absent options.
        await expect(meetings.meetingTimeDropdown()).toBeVisible();

        for (const label of details.unavailableStartLabels) {
          await expect(meetings.meetingTimeOption(label)).toHaveCount(0);
        }
      },
    );

    test(
      'TC-11690, TC-11697: Host can select a future date and schedule late meetings without crossing midnight',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        const timeZone = await meetings.getLocalTimeZone();
        const defaults = createScheduleMeetingDefaultsData(new Date(), timeZone);

        await meetings.openMeetingsAt(defaults.browserTime);
        await expect(meetings.emptyMeetingsTitle).toBeVisible();

        // Select tomorrow relative to the controlled browser date.
        const details = createMeetingDetailsData(defaults.browserTime, timeZone, 1);

        for (const scenario of LATE_MEETING_SCENARIOS) {
          // Each meeting starts from a fresh modal and default duration.
          await meetings.openScheduleMeetingModal();
          await expect(meetings.scheduleMeetingModal).toBeVisible();

          await meetings.fillMeetingTitle(scenario.title);
          await meetings.selectMeetingDate(details.dateLabel);

          await expect(meetings.meetingTimeField('Starts')).toContainText(defaults.startLabel);
          await expect(meetings.meetingTimeField('Ends')).toContainText(defaults.endLabel);

          // Change only Start; the application must calculate End.
          for (const startLabel of scenario.startLabels) {
            await meetings.selectTimeForGroup('Starts', startLabel);

            await expect(meetings.meetingTimeField('Starts')).toContainText(startLabel);
            await expect(meetings.meetingTimeField('Ends')).toContainText('11:45 PM');
          }

          // The selected future date remains unchanged after time adjustment.
          await expect(meetings.meetingDatePart('year')).toHaveAttribute('aria-valuenow', details.year);
          await expect(meetings.meetingDatePart('month')).toHaveAttribute('aria-valuenow', details.month);
          await expect(meetings.meetingDatePart('day')).toHaveAttribute('aria-valuenow', details.day);

          await meetings.clickScheduleMeetingSubmit();

          await expect(meetings.scheduleMeetingModal).toBeHidden();

          const meeting = meetings.meetingOccurrence(scenario.title, details.dayHeading);

          await expect(meeting).toHaveCount(1);
          await expect(meeting).toBeVisible();
          await expect(meetings.meetingTitle(meeting, scenario.title)).toHaveText(scenario.title);
          await expect(meeting).toContainText(scenario.timeRange);
        }

        // Both saved meetings remain present under the selected day.
        for (const scenario of LATE_MEETING_SCENARIOS) {
          const meeting = meetings.meetingOccurrence(scenario.title, details.dayHeading);

          await expect(meeting).toHaveCount(1);
          await expect(meeting).toContainText(scenario.timeRange);
        }

        await expect(meetings.meetingEntries).toHaveCount(2);
      },
    );

    test(
      'TC-11691: Host adjusts invalid time ranges and cannot schedule equal start and end times',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        const timeZone = await meetings.getLocalTimeZone();
        const defaults = createScheduleMeetingDefaultsData(new Date(), timeZone);

        await meetings.openMeetingsAt(defaults.browserTime);
        await expect(meetings.emptyMeetingsTitle).toBeVisible();

        const details = createMeetingDetailsData(defaults.browserTime, timeZone, 1);

        await meetings.openScheduleMeetingModal();
        await expect(meetings.scheduleMeetingModal).toBeVisible();

        await meetings.fillMeetingTitle(MEETING_TITLE);
        await meetings.selectMeetingDate(details.dateLabel);

        // Establish a one-hour range on the future date.
        await meetings.selectTimeForGroup('Starts', '1:00 PM');

        await expect(meetings.meetingTimeField('Starts')).toContainText('1:00 PM');
        await expect(meetings.meetingTimeField('Ends')).toContainText('2:00 PM');

        // An earlier End moves Start backward, preserving the duration.
        await meetings.selectTimeForGroup('Ends', '12:00 PM');

        await expect(meetings.meetingTimeField('Starts')).toContainText('11:00 AM');
        await expect(meetings.meetingTimeField('Ends')).toContainText('12:00 PM');

        // An End equal to the current Start also moves Start backward.
        await meetings.selectTimeForGroup('Ends', '11:00 AM');

        await expect(meetings.meetingTimeField('Starts')).toContainText('10:00 AM');
        await expect(meetings.meetingTimeField('Ends')).toContainText('11:00 AM');

        // At the latest supported Start, End cannot move beyond 23:45.
        await meetings.selectTimeForGroup('Starts', '11:45 PM');

        await expect(meetings.meetingTimeField('Starts')).toContainText('11:45 PM');
        await expect(meetings.meetingTimeField('Ends')).toContainText('11:45 PM');

        await meetings.clickScheduleMeetingSubmit();

        // Equal start and end times must prevent creation.
        await expect(meetings.meetingEndTimeError()).toBeVisible();
        await expect(meetings.meetingEndTimeError()).toHaveText('End time must be after start time');
        await expect(meetings.scheduleMeetingModal).toBeVisible();
        await expect(meetings.meetingEntries).toHaveCount(0);
      },
    );

    test(
      'TC-11704: host can close Schedule Meeting without creating a meeting',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        await meetings.openMeetingsTab();
        await expect(meetings.emptyMeetingsTitle).toBeVisible();

        await meetings.openScheduleMeetingModal();
        await expect(meetings.scheduleMeetingModal).toBeVisible();

        await meetings.fillMeetingTitle(MEETING_TITLE);
        await meetings.closeScheduleMeetingModal();

        await expect(meetings.scheduleMeetingModal).toBeHidden();
        await expect(meetings.meetingEntries).toHaveCount(0);
        await expect(meetings.emptyMeetingsTitle).toHaveText('No meetings yet.');
      },
    );

    test(
      'TC-11705:Host cannot create duplicate meetings by clicking Schedule multiple times',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);
        const meetings = PageManager.from(ownerPage).webapp.pages.meetings();

        await meetings.openMeetingsTab();
        await expect(meetings.emptyMeetingsTitle).toBeVisible();

        const details = createMeetingDetailsData(new Date(), await meetings.getLocalTimeZone());

        await meetings.openScheduleMeetingModal();
        await meetings.fillMeetingTitle(MEETING_TITLE);
        await meetings.selectMeetingDate(details.dateLabel);
        await meetings.selectTimeForGroup('Starts', details.startLabel);
        await meetings.selectTimeForGroup('Ends', details.endLabel);

        const creationRequest = await holdMeetingCreationRequest(ownerPage);

        try {
          await meetings.clickScheduleMeetingSubmit({clickCount: 3});

          await expect
            .poll(() => {
              return creationRequest.getRequestCount();
            })
            .toBe(1);

          await expect(meetings.scheduleMeetingSubmitButton).toBeDisabled();

          const response = await creationRequest.release();

          expect(response.ok()).toBe(true);
          await expect(meetings.scheduleMeetingModal).toBeHidden();

          const meeting = meetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);
          await expect(meeting).toBeVisible();
          await expect(meeting).toContainText(details.timeRange);
          await expect(meetings.meetingEntries).toHaveCount(1);
          expect(creationRequest.getRequestCount()).toBe(1);
        } finally {
          await creationRequest.dispose();
        }
      },
    );

    test(
      'TC-11663 Host can retry scheduling a meeting after a network failure',
      {tag: ['@regression']},
      async ({createUser, createTeam, createPage}) => {
        const {owner} = await createMeetingsTeam(createUser, createTeam, 0);
        const [ownerPage] = await loginMeetingsUsers(createPage, [owner]);

        const {pages, modals} = PageManager.from(ownerPage).webapp;
        const meetings = pages.meetings();
        const errorDialog = modals.acknowledge();
        const context = ownerPage.context();

        await meetings.openMeetingsTab();
        await expect(meetings.emptyMeetingsTitle).toBeVisible();

        const details = createMeetingDetailsData(new Date(), await meetings.getLocalTimeZone());

        // Prepare valid details while online.
        await meetings.openScheduleMeetingModal();
        await meetings.fillMeetingTitle(MEETING_TITLE);
        await meetings.selectMeetingDate(details.dateLabel);
        await meetings.selectTimeForGroup('Starts', details.startLabel);
        await meetings.selectTimeForGroup('Ends', details.endLabel);

        try {
          // The first submission fails while this browser session is offline.
          await context.setOffline(true);
          await meetings.clickScheduleMeetingSubmit();

          await expect(errorDialog.modalTitle).toHaveText('Could not schedule meeting');
          await expect(meetings.meetingEntries).toHaveCount(0);

          // Restore networking and dismiss only the error dialog.
          await context.setOffline(false);
          await errorDialog.clickAction();

          await expect(errorDialog.modalTitle).toBeHidden();
          await expect(meetings.scheduleMeetingModal).toBeVisible();

          // The original details remain available for retry.
          await expect(meetings.meetingTitleInput()).toHaveValue(MEETING_TITLE);

          // Retry the same form without refreshing or navigating away.
          await meetings.clickScheduleMeetingSubmit();

          await expect(meetings.scheduleMeetingModal).toBeHidden();

          const meeting = meetings.meetingOccurrence(MEETING_TITLE, details.dayHeading);

          await expect(meeting).toBeVisible();
          await expect(meeting).toContainText(details.timeRange);
          await expect(meetings.meetingEntries).toHaveCount(1);
        } finally {
          // Always restore networking before fixture cleanup.
          await context.setOffline(false);
        }
      },
    );
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
    test('host can start a large Meet now call through the prep modal without an extra confirmation dialog', async ({
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
        members.map(member => {
          return member.fullName;
        }),
      );

      await expect(meetings.meetingPrepModal).toBeVisible();
      await expect(
        meetings.meetingPrepModal.getByRole('heading', {name: LARGE_MEETING_TITLE, exact: true}),
      ).toBeVisible();
      await expect(ownerPages.calling().callCell).toBeHidden();
      await meetings.meetingPrepModal.getByRole('button', {name: 'Join', exact: true}).click();
      await expect(meetings.meetingPrepModal).toBeHidden();
      await expect(ownerModals.withoutTitle().modal).toBeHidden();
      await expect(ownerPages.calling().callCell).toBeVisible();
    });
  });
});
