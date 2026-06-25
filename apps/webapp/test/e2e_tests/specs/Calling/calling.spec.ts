/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Page} from 'playwright/test';
import {AudioType} from 'Repositories/audio/audioType';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withLogin, expect, Team, LOGIN_TIMEOUT} from 'test/e2e_tests/test.fixtures';
import {isPlayingAudio} from 'test/e2e_tests/utils/audio.util';
import {connectWithUser, createGroup, sendConnectionRequest} from 'test/e2e_tests/utils/userActions';

async function joinCall(userPages: PageManager['webapp']['pages']) {
  await expect(userPages.calling().callCell).toBeVisible();
  await userPages.calling().clickAcceptCallButton();
  await expect(userPages.calling().goFullScreen).toBeVisible();
}

test.describe('Calling', () => {
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Calling group';
  let team: Team;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();
    team = await createTeam('Team Call Team', {
      users: [userB, userC],
      features: {conferenceCalling: true},
    });
    userA = team.owner;
  });

  test(
    'Verify that current call is terminated if you want to call someone else (as caller)',
    {tag: ['@TC-2802', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);
      await connectWithUser(userAPage, userC);

      const {pages: userAPages, modals: userAModals} = PageManager.from(userAPage).webapp;
      const {pages: userBPages} = PageManager.from(userBPage).webapp;

      // User A has a call with user B
      await userAPages.conversationList().getConversation(userB.fullName).open();
      await userAPages.conversation().clickCallButton();
      await userBPages.calling().clickAcceptCallButton();
      await expect(userBPages.calling().callCell).toBeVisible();

      // User A starts a call with user C while in a call with user B
      await userAPages.conversationList().getConversation(userC.fullName).open();
      await userAPages.conversation().clickCallButton();

      // A modal is shown prompting him to confirm before cancelling the ongoing call
      await expect(userAModals.confirm().modalTitle).toContainText('Hang up current call?');
      await userAModals.confirm().clickAction();

      // The call with user B should be terminated
      await expect(userBPages.calling().callCell).not.toBeVisible();
    },
  );

  test('Verify Raise hand functionality', {tag: ['@TC-8773', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);

    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await createGroup(userAPages, groupName, [userB]);

    // Establish group call; required precondition for hand-raise testing
    await userAPages.conversationList().getConversation(groupName).open();
    await userAPages.conversation().clickCallButton();

    await joinCall(userBPages);

    const userACall = await userAPages.calling().maximizeCell();
    await expect(userACall.selfVideoThumbnail).toBeVisible();

    // Wait for the call to stabilize before testing the toast and thumbnail indicators
    await userAPage.waitForTimeout(2000);
    // User A raises hand and verifies the indicator appears on their thumbnail
    await userACall.toggleHandRaise();
    const toast = userAPage.getByText('You have raised your hand up');

    await expect(toast).toBeVisible();
    await expect(userACall.selfVideoThumbnail.getByText('✋')).toBeVisible();
    await expect(toast).toBeHidden({timeout: 3000});

    await userACall.toggleHandRaise();
    await expect(userACall.selfVideoThumbnail.getByText('✋')).toBeHidden();
  });

  test('Verify in call reactions', {tag: ['@TC-8774', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
    await connectWithUser(userAPage, userB);

    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await userAPages.conversationList().getConversation(userB.fullName).open();
    await userAPages.conversation().clickCallButton();
    await userBPages.calling().clickAcceptCallButton();

    const [userACall, userBCall] = await Promise.all([
      userAPages.calling().maximizeCell(),
      userBPages.calling().maximizeCell(),
    ]);

    const reactionAssertion = expect(userBCall.getReaction({emoji: '👍', sender: userA})).toBeVisible();
    await userACall.sendReaction('👍');
    await reactionAssertion;
  });

  test(
    'I want to answer incoming call with Join button in conversation view',
    {tag: ['@TC-2826', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
      await userAPages.conversation().clickCallButton();

      const {joinCallButton} = userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'});
      await expect(joinCallButton).toBeVisible();
      await expect(userBPages.calling().acceptCallButton).toBeVisible();

      await joinCallButton.click();
      await expect(userBPages.calling().acceptCallButton).not.toBeVisible();
    },
  );

  [
    {
      description: 'Verify 1on1 call ringing terminates on second client when accepting call',
      tag: '@TC-2823',
      conversationType: '1on1',
    },
    {
      description: 'Verify group call ringing stops on second client when accepting call',
      tag: '@TC-2824',
      conversationType: 'group',
    },
  ].forEach(({description, tag, conversationType}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPage, userBPage1] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBDevice1Pages = PageManager.from(userBPage1).webapp.pages;

      // Log in second device of user B confirming new history
      const userBPage2 = await createPage(withLogin(userB, {confirmNewHistory: true}));
      const userBDevice2Pages = PageManager.from(userBPage2).webapp.pages;

      if (conversationType === '1on1') {
        await userAPages.conversationList().getConversation(userB.fullName).open();
      } else {
        await createGroup(userAPages, 'Calling group', [userB]);
        await userAPages.conversationList().getConversation('Calling group').open();
      }

      // Ensure no audio is playing on both devices initially
      await expect.poll(() => isPlayingAudio(userBPage1, AudioType.INCOMING_CALL)).toBe(false);
      await expect.poll(() => isPlayingAudio(userBPage2, AudioType.INCOMING_CALL)).toBe(false);

      // User A calls user B, confirming both devices are ringing
      await userAPages.conversation().clickCallButton();
      await expect(userAPages.calling().callCell).toBeVisible();

      await expect(userBDevice1Pages.calling().callCell).toBeVisible();
      await expect.poll(() => isPlayingAudio(userBPage1, AudioType.INCOMING_CALL)).toBe(true);
      await expect.poll(() => isPlayingAudio(userBPage2, AudioType.INCOMING_CALL)).toBe(true);

      // User B accepts the call from the first device and both devices should stop ringing
      await userBDevice1Pages.calling().clickAcceptCallButton();
      await expect(userBDevice1Pages.calling().callCell).toBeVisible();
      await expect.poll(() => isPlayingAudio(userBPage1, AudioType.INCOMING_CALL)).toBe(false);
      await expect(userBDevice2Pages.calling().callCell).not.toBeVisible();
      await expect.poll(() => isPlayingAudio(userBPage2, AudioType.INCOMING_CALL)).toBe(false);
    });
  });

  test(
    'Verify I can make another call while current one is ignored',
    {tag: ['@TC-2803', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);
      await connectWithUser(userBPage, userC);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      // User A calls user B
      await userAPages.conversationList().getConversation(userB.fullName).open();
      await userAPages.conversation().clickCallButton();

      // User B declines the call
      await userBPages.calling().clickLeaveCallButton();
      await expect(userBPages.calling().callCell).not.toBeVisible();

      // User B calls user C instead
      await userBPages.conversationList().getConversation(userC.fullName).open();
      await expect(userBPages.conversation().callButton).toBeEnabled();
      await userBPages.conversation().startCall();
      await expect(userBPages.calling().callCell).toBeVisible();
    },
  );

  [
    {
      description: 'Verify able to join ongoing call',
      tag: '@TC-2820',
    },
    {
      description: 'Late joiner wants to see the ongoing screen sharing on group call',
      tag: '@TC-2874',
      verifyScreenShare: true,
    },
  ].forEach(({description, tag, verifyScreenShare}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPages, userBPages, userCPage] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
        createPage(withLogin(userC)),
      ]);

      const userCPages = PageManager.from(userCPage).webapp.pages;
      await createGroup(userAPages, groupName, [userB, userC]);

      await userAPages.conversationList().getConversation(groupName).open();
      await userAPages.conversation().clickCallButton();

      await expect(userAPages.calling().callCell).toBeVisible();
      await joinCall(userBPages);

      // User A starts screen sharing
      await userAPages.calling().clickToggleScreenShareButton();

      // // User C joins the ongoing call
      await userCPage.waitForTimeout(5000);
      await userCPages.conversationList().getConversation(groupName).joinCallButton.click();

      // Confirm that user C joined the call
      await expect(userCPages.calling().goFullScreen).toBeVisible();
      await expect(userCPages.calling().gridTiles).toHaveCount(3);

      if (verifyScreenShare) {
        const userCCall = await userCPages.calling().maximizeCell();
        await expect(userCCall.getGridTile(userA.fullName).videoElement).toBeVisible();
      }
    });
  });

  test('Verify Call UI checks', {tag: ['@TC-8771', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await createGroup(userAPages, groupName, [userB, userC]);

    await userAPages.conversationList().getConversation(groupName).open();
    await userAPages.conversation().clickCallButton();

    await expect(userAPages.calling().callCell).toBeVisible();
    await joinCall(userBPages);

    await userAPages.calling().maximizeCell();
    await expect(userAPages.calling().selfVideoThumbnail).toBeVisible();
    await expect(userAPages.calling().getGridTile(userA.fullName).muteIcon).not.toBeAttached();
  });

  test('Verify leaving and coming back to the group call', {tag: ['@TC-2808', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await createGroup(userAPages, groupName, [userB]);

    // User A initiates the call
    await userAPages.conversationList().getConversation(groupName).open();
    await userAPages.conversation().clickCallButton();

    await expect(userAPages.calling().callCell).toBeVisible();

    // User B joins the call
    await joinCall(userBPages);
    await expect(userBPages.calling().goFullScreen).toBeVisible();

    // User B leaves the group call
    await userBPages.calling().clickLeaveCallButton();
    await expect(userBPages.calling().callCell).toBeHidden();

    // User B re-joins the ongoing call from the conversation list
    await userBPages.conversationList().getConversation(groupName).joinCallButton.click({timeout: 30_000});

    await expect(userBPages.calling().goFullScreen).toBeVisible();
  });

  test('Verify ignoring group call', {tag: ['@TC-2811', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);

    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await createGroup(userAPages, groupName, [userB]);

    // User A initiates the call
    await userAPages.conversationList().getConversation(groupName).open();
    await userAPages.conversation().clickCallButton();

    await expect(userAPages.calling().callCell).toBeVisible();
    await expect(userBPages.calling().callCell).toBeVisible();
    await expect.poll(() => isPlayingAudio(userBPage, AudioType.INCOMING_CALL)).toBe(true);

    await userBPages.calling().clickLeaveCallButton();
    await expect(userBPages.calling().callCell).toBeHidden();
    await expect.poll(() => isPlayingAudio(userBPage, AudioType.INCOMING_CALL)).toBe(false);
  });

  test(
    'Verify joining and leaving call from second client does not disconnect the first client',
    {tag: ['@TC-2827', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      // Log in a second session/device for User A.
      const userAPage2 = await createPage(withLogin(userA, {confirmNewHistory: true}));
      const userADevice2Pages = PageManager.from(userAPage2).webapp.pages;

      // Setup: Create a group to host the call
      await createGroup(userAPages, groupName, [userB]);

      await test.step('User A starts a call and User B joins', async () => {
        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickCallButton();

        await expect(userAPages.calling().callCell).toBeVisible();

        await joinCall(userBPages);
      });

      await test.step('User A joins then leaves the call from their second device', async () => {
        await userADevice2Pages.conversationList().getConversation(groupName).open();
        await userADevice2Pages.conversation().clickCallButton();
        await expect(userADevice2Pages.calling().callCell).toBeVisible();

        await expect(userADevice2Pages.calling().gridTiles).toHaveCount(3);

        // Verify second device successfully disconnected
        await userADevice2Pages.calling().clickLeaveCallButton();
        await expect(userADevice2Pages.calling().callCell).not.toBeAttached();
      });

      await test.step('Verify User A’s first device remains in the call throughout', async () => {
        await expect(userAPages.calling().goFullScreen).toBeVisible();

        await userAPages.calling().clickLeaveCallButton();
        await expect(userAPages.calling().callCell).not.toBeAttached();
        // Verify the call is still "joinable" (User B is still there)
        await expect(userAPages.conversationList().getConversation(groupName).joinCallButton).toBeVisible({
          timeout: 30_000,
        });
      });
    },
  );

  test(
    'I should not stay in the call when I get removed from the group',
    {tag: ['@TC-2837', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, groupName, [userB, userC]);

      // User A initiates the call
      await userAPages.conversationList().getConversation(groupName).open();
      await userAPages.conversation().clickCallButton();

      await expect(userAPages.calling().callCell).toBeVisible();

      // Ensure all invited members join the call
      for (const member of [userBPages, userCPages]) {
        await joinCall(member);
      }

      // User A removes User B from the group
      await userAPages.conversation().toggleGroupInformation();
      await userAPages.conversation().removeMemberFromGroup(userB.fullName);
      await expect(
        userAPages.conversation().systemMessages.filter({hasText: `You removed ${userB.fullName}`}),
      ).toBeVisible();

      // User B is kicked out of a call
      await expect(userBPages.calling().callCell).not.toBeAttached();
    },
  );

  test(
    'I should not be able to join a call when I get removed from the group',
    {tag: ['@TC-2838', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, groupName, [userB]);

      // User A initiates the call
      await userAPages.conversationList().getConversation(groupName).open();
      await userAPages.conversation().clickCallButton();

      await expect(userAPages.calling().callCell).toBeVisible();
      await expect(userBPages.calling().callCell).toBeVisible();
      await expect(userBPages.conversationList().getConversation(groupName).joinCallButton).toBeVisible();

      // User A removes User B from the group
      await userAPages.conversation().toggleGroupInformation();
      await userAPages.conversation().removeMemberFromGroup(userB.fullName);
      await expect(
        userAPages.conversation().systemMessages.filter({hasText: `You removed ${userB.fullName}`}),
      ).toBeVisible();

      // User B cannot join the group call
      await expect(userBPages.calling().callCell).not.toBeAttached();
      await expect(userBPages.conversationList().getConversation(groupName).joinCallButton).not.toBeAttached();
    },
  );

  test(
    'I want to see warning when calling a big group',
    {tag: ['@TC-2842', '@regression']},
    async ({createPage, createUser}) => {
      // Create Users and add to team
      const extraMembers = await Promise.all(Array.from({length: 4}, () => createUser()));

      for (const member of extraMembers) {
        await team.addTeamMember(member);
      }

      const allMembers = [userB, userC, ...extraMembers];
      const userAPage = await createPage(withLogin(userA));

      const {pages: userAPages, modals: userAModals} = PageManager.from(userAPage).webapp;

      await createGroup(userAPages, groupName, allMembers);
      await userAPages.conversationList().getConversation(groupName).open();
      await userAPages.conversation().clickCallButton();

      await expect(userAModals.withoutTitle().modalText).toContainText(
        `Are you sure you want to call ${allMembers.length} people?`,
      );
    },
  );

  test(
    'I want to see the full call participant list',
    {tag: ['@TC-2844', '@regression']},
    async ({createPage, createUser}) => {
      const guestUser = await createUser();
      const [userAPage, userBPage, guestPage] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))),
        PageManager.from(createPage(withLogin(userB))),
        PageManager.from(createPage(withLogin(guestUser))),
      ]);
      await sendConnectionRequest(userAPage, guestUser);
      await connectWithUser(userAPage, userB);

      const [userAPages, userBPages, guestPages] = [userAPage, userBPage, guestPage].map(pm => pm.webapp.pages);

      // --- Setup and Call Initialization ---
      await test.step('Setup: Accept connection and start group call', async () => {
        await guestPages.conversationList().openPendingConnectionRequest();
        await guestPages.connectRequest().clickConnectButton();
        await expect(userAPages.conversationList().getConversation(guestUser.fullName)).toBeAttached();
        await expect(guestPages.conversationList().getConversation(userA.fullName)).toBeAttached();

        await createGroup(userAPages, groupName, [userB, guestUser]);

        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickCallButton();
      });

      await test.step('Join call with all participants', async () => {
        for (const member of [userBPages, guestPages]) {
          await joinCall(member);
        }
      });

      const userACall = await userAPages.calling().maximizeCell();
      await userACall.toggleParticipantsList();
      await expect(userACall.getCallingParticipant(guestUser.fullName).guestIcon).toBeVisible();

      const participants = [
        {pages: userBPages, name: userB.fullName, label: 'User B'},
        {pages: guestPages, name: guestUser.fullName, label: 'Guest User'},
      ];

      const features = [
        {
          name: 'Mute',
          action: (p: PageManager['webapp']['pages']) => p.calling().toggleMuteButton.click(),
          verify: async (name: string) => {
            await expect(userACall.getCallingParticipant(name).muteIcon).not.toBeVisible();
            await expect(userACall.getGridTile(name).muteIcon).not.toBeVisible();
          },
        },
        {
          name: 'Screenshare',
          action: (p: PageManager['webapp']['pages']) => p.calling().clickToggleScreenShareButton(),
          verify: async (name: string) => {
            await expect(userACall.getCallingParticipant(name).screenShareIcon).toBeVisible();
            await expect(userACall.getGridTile(name).videoElement).toBeVisible();
          },
        },
        {
          name: 'Video',
          action: (p: PageManager['webapp']['pages']) => p.calling().clickToggleVideoButton(),
          verify: async (name: string) => {
            await expect(userACall.getCallingParticipant(name).videoIcon).toBeVisible();
            await expect(userACall.getGridTile(name).videoElement).toBeVisible();
          },
        },
      ];

      for (const participant of participants) {
        for (const feature of features) {
          await test.step(`${participant.label}: Verify ${feature.name}`, async () => {
            await feature.action(participant.pages);
            await feature.verify(participant.name);
          });
        }
      }
    },
  );

  test(
    'I want to accept a group video call as a personal account guest',
    {tag: ['@TC-2852', '@regression']},
    async ({createPage}) => {
      test.setTimeout(150_000);

      const [userAPage, guestPage] = await Promise.all([createPage(withLogin(userA)), createPage()]);
      const {pages: ownerPages, modals: ownerModals} = PageManager.from(userAPage).webapp;
      const guestPages = PageManager.from(guestPage).webapp.pages;

      const createdLink = await test.step('Owner: Create group and generate guest invitation link', async () => {
        await createGroup(ownerPages, groupName, []);
        await ownerPages.conversationList().getConversation(groupName).open();
        await ownerPages.conversation().toggleGroupInformation();
        await ownerPages.conversationDetails().openGuestOptions();
        return await ownerPages.guestOptions().createLink();
      });

      await test.step('Guest: Navigate to link and log in with personal account', async () => {
        await guestPage.goto(createdLink.toString());
        await guestPages.conversationJoin().joinBrowserButton.click();
        await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

        await guestPages.login().login(userB);
        await guestPages.conversation().conversationTitle.waitFor({
          state: 'visible',
          timeout: LOGIN_TIMEOUT,
        });
      });

      await test.step('Owner: Verify guest arrival and initiate video call', async () => {
        await expect(
          ownerPages.conversation().systemMessages.filter({hasText: `${userB.fullName} joined`}),
        ).toBeVisible();

        await ownerPages.conversation().toggleGroupInformation();
        await ownerPages.conversation().clickCallButton();

        // Warning modal that guest started using a new device
        await expect(ownerModals.confirm().modalTitle).toContainText('new device');
        await ownerModals.confirm().clickAction();

        await expect(ownerPages.calling().callCell).toBeVisible();
      });

      await test.step('Guest: Join the active call', async () => {
        const {joinCallButton} = guestPages.conversationList().getConversation(groupName);

        await expect(guestPages.calling().callCell).toBeVisible();
        await expect(joinCallButton).toBeVisible();

        await joinCallButton.click();
        await expect(ownerPages.calling().goFullScreen).toBeVisible();
      });
    },
  );

  [
    {
      description: 'I want to navigate between call pages',
      tag: '@TC-2924',
      verify: async (callScreen: ReturnType<PageManager['webapp']['pages']['fullScreenCall']>, localUser: string) => {
        await expect(callScreen.getGridTile(localUser)).toBeVisible();
        await callScreen.goToNextPage();
        await expect(callScreen.getGridTile(localUser)).toBeHidden();
        await callScreen.goToPreviousPage();
        await expect(callScreen.getGridTile(localUser)).toBeVisible();
      },
    },
    {
      description: 'I want to see video tiles ordered alphabetically by user names',
      tag: '@TC-2927',
      verify: async (callScreen: ReturnType<PageManager['webapp']['pages']['fullScreenCall']>, localUser: string) => {
        await expect(callScreen.gridTiles).toHaveCount(6); // Ensure first grid page is full
        const displayedNames = await callScreen.gridTiles.getByTestId('call-participant-name').allInnerTexts();
        const listToVerify = displayedNames.filter(name => name !== localUser);
        const sortedNames = listToVerify.toSorted((a, b) => a.localeCompare(b));

        expect(listToVerify).toEqual(sortedNames);
      },
    },
  ].forEach(({description, tag, verify}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage, createUser}) => {
      const {pages: userAPages, modals: userAModals} = PageManager.from(await createPage(withLogin(userA))).webapp;

      const {groupMembers, memberPages} =
        await test.step('Setup: Create members and initialize all browser pages', async () => {
          // Generate a large participant list to trigger pagination
          const extraMembers = await Promise.all(Array.from({length: 7}, () => createUser()));
          const groupMembers = [userB, userC, ...extraMembers];

          await Promise.all(extraMembers.map(member => team.addTeamMember(member)));

          const memberPages = await Promise.all(
            groupMembers.map(async member => {
              const page = await createPage(withLogin(member));
              return PageManager.from(page).webapp.pages;
            }),
          );

          return {groupMembers, memberPages};
        });

      await test.step('Action: User A initiates the group call', async () => {
        await createGroup(userAPages, groupName, groupMembers);
        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickCallButton();
        // Warning modal about large group call
        await userAModals.withoutTitle().clickAction();
        await expect(userAPages.calling().goFullScreen).toBeVisible();
      });

      await test.step('Action: All members accept the incoming call', async () => {
        await Promise.all(
          memberPages.map(async memberPage => {
            await joinCall(memberPage);
          }),
        );
      });

      await test.step('Verify functionality', async () => {
        const callScreen = await userAPages.calling().maximizeCell();
        await verify(callScreen, userA.fullName);
      });
    });
  });

  [
    {
      description: 'As a moderator I want to mute another participant',
      tag: '@TC-2928',
      verify: async (callScreen: ReturnType<PageManager['webapp']['pages']['fullScreenCall']>) => {
        const contextMenu = await callScreen.getCallingParticipant(userB.fullName).openContextMenu();
        await contextMenu.muteButton.click();

        await expect(callScreen.getCallingParticipant(userB.fullName).muteIcon).toBeVisible();
        await expect(callScreen.getGridTile(userB.fullName).muteIcon).toBeVisible();
      },
    },
    {
      description: 'As moderator of a call I want to mute all other participants',
      tag: '@TC-2929',
      verify: async (callScreen: ReturnType<PageManager['webapp']['pages']['fullScreenCall']>) => {
        const firstContextMenu = await callScreen.getCallingParticipant(userB.fullName).openContextMenu();
        await firstContextMenu.muteButton.click();

        const secondContextMenu = await callScreen.getCallingParticipant(userB.fullName).openContextMenu();
        await secondContextMenu.muteOthersButton.click();

        for (const participant of [userB, userC]) {
          await expect(callScreen.getCallingParticipant(participant.fullName).muteIcon).toBeVisible();
          await expect(callScreen.getGridTile(participant.fullName).muteIcon).toBeVisible();
        }
      },
    },
  ].forEach(({description, tag, verify}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPages, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await test.step('Setup: Create group and start call', async () => {
        await createGroup(userAPages, groupName, [userB, userC]);
        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickCallButton();

        await expect(userAPages.calling().callCell).toBeVisible();
      });

      await test.step('All participants join the call', async () => {
        for (const member of [userBPages, userCPages]) {
          await joinCall(member);
          await member.calling().toggleMute(); // Ensure active mic state
        }
      });

      await test.step('Verify moderator can mute other participants', async () => {
        const userACall = await userAPages.calling().maximizeCell();
        await userACall.toggleParticipantsList();

        await expect(userACall.getCallingParticipant(userB.fullName).muteIcon).not.toBeVisible();
        await expect(userACall.getCallingParticipant(userC.fullName).muteIcon).not.toBeVisible();

        await verify(userACall);
      });
    });
  });

  [
    {
      description: 'I want to unmute myself after I got muted',
      tag: '@TC-2931',
      verify: async (userCallPage: Page) => {
        const userCallPages = PageManager.from(userCallPage).webapp.pages;
        await userCallPages.calling().fullScreenMuteButton.click();
        await expect(userCallPages.calling().getGridTile(userB.fullName).muteIcon).not.toBeVisible();
      },
    },
    {
      description: 'I want to get notified when I got muted',
      tag: '@TC-2932',
      verify: async (userCallPage: Page) => {
        await expect(userCallPage.getByText('You have been muted')).toBeVisible();
      },
    },
  ].forEach(({description, tag, verify}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await test.step('Setup: Create group and start call', async () => {
        await createGroup(userAPages, groupName, [userB]);
        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickCallButton();

        await expect(userAPages.calling().callCell).toBeVisible();
      });

      await test.step('User B joins the call', async () => {
        await joinCall(userBPages);
        await userBPages.calling().toggleMute(); // Ensure active mic state
        await userBPages.calling().maximizeCell();
      });

      await test.step('Moderator mutes User B', async () => {
        const userACall = await userAPages.calling().maximizeCell();
        await userACall.toggleParticipantsList();
        const userBParticipant = userACall.getCallingParticipant(userB.fullName);

        await expect(userBParticipant.muteIcon).not.toBeVisible();

        const contextMenu = await userBParticipant.openContextMenu();
        await contextMenu.muteButton.click();

        await expect(userBParticipant.muteIcon).toBeVisible();
      });

      await test.step('Verify mute functionality', async () => {
        await verify(userBPage);
      });
    });
  });

  test(
    'I want to see a group call timing out after 300s if no one else joined',
    {tag: ['@TC-2936', '@regression']},
    async ({createPage}, testInfo) => {
      test.setTimeout(testInfo.timeout + 300_000);

      const userAPage = await createPage(withLogin(userA));
      const userAPages = PageManager.from(userAPage).webapp.pages;

      await createGroup(userAPages, groupName, [userB, userC]);

      // User A initiates the call
      await userAPages.conversationList().getConversation(groupName).open();
      await userAPages.conversation().clickCallButton();
      await expect(userAPages.calling().callCell).toBeVisible();

      await userAPage.waitForTimeout(300_000);
      await expect(
        userAPages
          .conversation()
          .systemMessages.filter({hasText: 'Your call was ended because no other participant joined.'}),
      ).toBeVisible();
      await expect(userAPages.calling().callCell).not.toBeVisible();
    },
  );

  test(
    "I want to see a group call timing out after 90s if I'm the last one left in the call",
    {tag: ['@TC-2937', '@regression']},
    async ({createPage}, testInfo) => {
      test.setTimeout(testInfo.timeout + 90_000);

      const [userAPage, userBPage, userCPage] = await Promise.all([
        createPage(withLogin(userA)),
        createPage(withLogin(userB)),
        createPage(withLogin(userC)),
      ]);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;
      const userCPages = PageManager.from(userCPage).webapp.pages;

      await test.step('Setup: Create group and start call', async () => {
        await createGroup(userAPages, groupName, [userB, userC]);
        await userAPages.conversationList().getConversation(groupName).open();
        await userAPages.conversation().clickCallButton();

        await expect(userAPages.calling().callCell).toBeVisible();
      });

      await test.step('User B and User C join the call', async () => {
        for (const member of [userBPages, userCPages]) {
          await joinCall(member);
        }
        await expect(userAPages.calling().gridTiles).toHaveCount(3);
      });

      await test.step('User B and User C leave the call', async () => {
        for (const member of [userBPages, userCPages]) {
          await member.calling().clickLeaveCallButton();
          await expect(member.calling().goFullScreen).toBeHidden();
        }
      });

      await test.step('Verify call ends for User A after 90s of being the last one in the call', async () => {
        await userAPage.waitForTimeout(90_000);
        await expect(userAPages.calling().goFullScreen).toBeHidden();
        await expect(
          userAPages
            .conversation()
            .systemMessages.filter({hasText: 'Your call was ended because all other participants left'}),
        ).toBeVisible();
      });
    },
  );

  test('I want to see multiple active speakers in 1 call', {tag: ['@TC-2945', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages, userCPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
    ]);

    await test.step('Setup: Create group and start call', async () => {
      await createGroup(userAPages, groupName, [userB, userC]);
      await userAPages.conversationList().getConversation(groupName).open();
      await userAPages.conversation().clickCallButton();

      await expect(userAPages.calling().callCell).toBeVisible();
    });

    await test.step('User B and User C join the call', async () => {
      for (const member of [userBPages, userCPages]) {
        await joinCall(member);
      }
    });

    await test.step('Verify 2 speakers are active in the call', async () => {
      const userACall = await userAPages.calling().maximizeCell();
      await userACall.toggleParticipantsList();

      await userBPages.calling().maximizeCell();
      await userBPages.calling().unmuteSelfInFullScreen();

      await expect(userBPages.calling().getGridTile(userB.fullName).muteIcon).toBeHidden(); // Ensure active video state

      await expect(userACall.getCallingParticipant(userA.fullName).activeSpeakerIcon).toBeVisible();
      await expect(userACall.getCallingParticipant(userB.fullName).activeSpeakerIcon).toBeVisible({timeout: 30_000});
    });
  });

  [
    {id: '@TC-2908', title: 'I want to have 1:1 CBR audio call when the caller turned it on'} as const,
    {id: '@TC-2909', title: 'I want to have 1:1 CBR audio call when the receiver turned it on'} as const,
  ].forEach(({id, title}) => {
    test(title, {tag: [id, '@regression']}, async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const {pages: userAPages} = PageManager.from(userAPage).webapp;
      const {pages: userBPages} = PageManager.from(userBPage).webapp;

      if (id === '@TC-2908') {
        await test.step('Caller enables CBR', async () => {
          const {pages: callerPages, components: callerComponents} = PageManager.from(userAPage).webapp;
          await callerComponents.conversationSidebar().preferencesButton.click();
          await callerPages.settings().audioVideoButton.click();
          await callerPages.audioVideoSettings().variableBitrateCheckbox.click();
          await callerComponents.conversationSidebar().allConversationsButton.click();
        });
      }
      if (id === '@TC-2909') {
        await test.step('Receiver enables CBR', async () => {
          const {pages: receiverPages, components: receiverComponents} = PageManager.from(userBPage).webapp;
          await receiverComponents.conversationSidebar().preferencesButton.click();
          await receiverPages.settings().audioVideoButton.click();
          await receiverPages.audioVideoSettings().variableBitrateCheckbox.click();
          await receiverComponents.conversationSidebar().allConversationsButton.click();
        });
      }

      await test.step('UserA calls userB', async () => {
        await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
        await userAPages.conversation().callButton.click();
        await userBPages.calling().acceptCallButton.click();
      });

      await test.step('Caller and receiver see CBR text in call window', async () => {
        await expect(userAPages.calling().callCell).toContainText('CBR');
        await expect(userBPages.calling().callCell).toContainText('CBR');
      });
    });
  });
});
