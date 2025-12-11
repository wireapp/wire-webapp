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

import {AudioType} from 'Repositories/audio/AudioType';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withConnectedUser, withLogin, expect} from 'test/e2e_tests/test.fixtures';
import {isPlayingAudio} from 'test/e2e_tests/utils/audio.util';

test.describe('Calling', () => {
  let userA: User;
  let userB: User;
  let userC: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Team Call Team', {withMembers: 2});
    userA = team.owner;
    userB = team.members[0];
    userC = team.members[1];
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

      await userAPages.conversationList().openConversation(userB.fullName);
      await userAPages.conversation().clickCallButton();

      await expect(userBPages.conversationList().joinCallButton).toBeVisible();
      await expect(userBPages.calling().acceptCallButton).toBeVisible();

      await userBPages.conversationList().joinCallButton.click();
      await expect(userBPages.calling().acceptCallButton).not.toBeVisible();
    },
  );

  test(
    'Verify 1on1 call ringing terminates on second client when accepting call',
    {tag: ['@TC-2823', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage1] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBDevice1Pages = PageManager.from(userBPage1).webapp.pages;

      // Log in second device of user B confirming new history
      const userBPage2 = await createPage(withLogin(userB, {confirmNewHistory: true}));
      const userBDevice2Pages = PageManager.from(userBPage2).webapp.pages;

      // Ensure no audio is playing on both devices initially
      await userAPages.conversationList().openConversation(userB.fullName);
      await expect.poll(() => isPlayingAudio(userBPage1, AudioType.INCOMING_CALL)).toBe(false);
      await expect.poll(() => isPlayingAudio(userBPage2, AudioType.INCOMING_CALL)).toBe(false);

      // User A calls user B, confirming both devices are ringing
      await userAPages.conversation().clickCallButton();
      await expect.poll(() => isPlayingAudio(userBPage1, AudioType.INCOMING_CALL)).toBe(true);
      await expect.poll(() => isPlayingAudio(userBPage2, AudioType.INCOMING_CALL)).toBe(true);

      // User B accepts the call from the first device and both devices should stop ringing
      await userBDevice1Pages.calling().clickAcceptCallButton();
      await expect(userBDevice1Pages.calling().callCell).toBeVisible();
      await expect.poll(() => isPlayingAudio(userBPage1, AudioType.INCOMING_CALL)).toBe(false);
      await expect(userBDevice2Pages.calling().callCell).not.toBeVisible();
      await expect.poll(() => isPlayingAudio(userBPage2, AudioType.INCOMING_CALL)).toBe(false);
    },
  );
});
