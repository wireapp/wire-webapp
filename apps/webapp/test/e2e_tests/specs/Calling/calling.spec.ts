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

import {AudioType} from 'Repositories/audio/audioType';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withConnectedUser, withLogin, expect} from 'test/e2e_tests/test.fixtures';
import {isPlayingAudio} from 'test/e2e_tests/utils/audio.util';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Calling', () => {
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Calling group';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();
    const team = await createTeam('Team Call Team', {
      users: [userB, userC],
      features: {conferenceCalling: true},
    });
    userA = team.owner;
  });

  test(
    'Verify that current call is terminated if you want to call someone else (as caller)',
    {tag: ['@TC-2802', '@regression']},
    async ({createPage}) => {
      const [{pages: userAPages, modals: userAModals}, {pages: userBPages}] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB), withConnectedUser(userC))).then(
          pm => pm.webapp,
        ),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp),
      ]);

      // User A has a call with user B
      await userAPages.conversationList().openConversation(userB.fullName);
      await userAPages.conversation().clickCallButton();
      await userBPages.calling().clickAcceptCallButton();
      await expect(userBPages.calling().callCell).toBeVisible();

      // User A starts a call with user C while in a call with user B
      await userAPages.conversationList().openConversation(userC.fullName);
      await userAPages.conversation().clickCallButton();

      // A modal is shown prompting him to confirm before cancelling the ongoing call
      await expect(userAModals.confirm().modalTitle).toContainText('Hang up current call?');
      await userAModals.confirm().clickAction();

      // The call with user B should be terminated
      await expect(userBPages.calling().callCell).not.toBeVisible();
    },
  );

  test('Verify Raise hand functionality', {tag: ['@TC-8773', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([
      createPage(withLogin(userA), withConnectedUser(userB)),
      createPage(withLogin(userB)),
    ]);

    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await createGroup(userAPages, groupName, [userB]);

    // Establish group call; required precondition for hand-raise testing
    await userAPages.conversationList().openConversation(groupName);
    await userAPages.conversation().clickCallButton();

    await expect(userBPages.calling().callCell).toBeVisible();
    await userBPages.calling().clickAcceptCallButton();

    await expect(userBPages.calling().goFullScreen).toBeVisible();

    const userACall = await userAPages.calling().maximizeCell();
    await expect(userACall.selfVideoThumbnail).toBeVisible();

    // User A raises hand and verifies the indicator appears on their thumbnail
    await userACall.toggleHandRaise();
    const toast = userAPage.getByText('You have raised your hand up');

    await expect(toast).toBeVisible({timeout: 1_000});
    await expect(userACall.selfVideoThumbnail.getByText('✋')).toBeVisible();

    await expect(toast).toBeHidden({timeout: 3000});

    await userACall.toggleHandRaise();
    await expect(userACall.selfVideoThumbnail.getByText('✋')).toBeHidden();
  });

  test('Verify in call reactions', {tag: ['@TC-8774', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName);
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
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().clickCallButton();

      const {joinCallButton} = userBPages.conversationList().getConversationLocator(userA.fullName, {protocol: 'mls'});
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
      const [userAPage, userBPage1] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBDevice1Pages = PageManager.from(userBPage1).webapp.pages;

      // Log in second device of user B confirming new history
      const userBPage2 = await createPage(withLogin(userB, {confirmNewHistory: true}));
      const userBDevice2Pages = PageManager.from(userBPage2).webapp.pages;

      if (conversationType === '1on1') {
        await userAPages.conversationList().openConversation(userB.fullName);
      } else {
        await createGroup(userAPages, 'Calling group', [userB]);
        await userAPages.conversationList().openConversation('Calling group');
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
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userC))).then(pm => pm.webapp.pages),
      ]);

      // User A calls user B
      await userAPages.conversationList().openConversation(userB.fullName);
      await userAPages.conversation().clickCallButton();

      // User B declines the call
      await userBPages.calling().clickLeaveCallButton();
      await expect(userBPages.calling().callCell).not.toBeVisible();

      // User B calls user C instead
      await userBPages.conversationList().openConversation(userC.fullName);
      await expect(userBPages.conversation().callButton).toBeEnabled();
      await userBPages.conversation().startCall();
      await expect(userBPages.calling().callCell).toBeVisible();
    },
  );

  test('Verify able to join ongoing call', {tag: ['@TC-2820', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages, userCPage] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB), withConnectedUser(userC))).then(pm => pm.webapp.pages),
      createPage(withLogin(userC)),
    ]);

    const userCPages = PageManager.from(userCPage).webapp.pages;
    await createGroup(userAPages, groupName, [userB, userC]);

    await userAPages.conversationList().openConversation(groupName);
    await userAPages.conversation().clickCallButton();

    await expect(userAPages.calling().callCell).toBeVisible();
    await expect(userBPages.calling().callCell).toBeVisible();

    await userBPages.calling().clickAcceptCallButton();
    // Confirm the calls grid is visible
    await expect(userBPages.calling().goFullScreen).toBeVisible();

    // User C joins the ongoing call
    await expect(userCPages.conversationList().joinCallButton).toBeVisible();
    await userCPages.conversationList().joinCallButton.click();

    // Confirm that user C joined the call
    await expect(userCPages.calling().goFullScreen).toBeVisible();
  });

  test('Verify Call UI checks', {tag: ['@TC-8771', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await createGroup(userAPages, groupName, [userB, userC]);

    await userAPages.conversationList().openConversation(groupName);
    await userAPages.conversation().clickCallButton();

    await expect(userAPages.calling().callCell).toBeVisible();
    await expect(userBPages.calling().callCell).toBeVisible();

    await userBPages.calling().clickAcceptCallButton();
    await expect(userBPages.calling().goFullScreen).toBeVisible();

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
    await userAPages.conversationList().openConversation(groupName);
    await userAPages.conversation().clickCallButton();

    await expect(userAPages.calling().callCell).toBeVisible();
    await expect(userBPages.calling().callCell).toBeVisible();

    // User B joins the call
    await userBPages.calling().clickAcceptCallButton();
    await expect(userBPages.calling().goFullScreen).toBeVisible();

    // User B leaves the group call
    await userBPages.calling().clickLeaveCallButton();
    await expect(userBPages.calling().callCell).toBeHidden();

    // User B re-joins the ongoing call from the conversation list
    const joinButton = userBPages.conversationList().joinCallButton;
    await expect(joinButton).toBeVisible({timeout: 10_000});
    await joinButton.click();

    await expect(userBPages.calling().goFullScreen).toBeVisible();
  });
});
