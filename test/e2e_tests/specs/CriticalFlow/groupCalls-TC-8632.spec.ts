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

import {BrowserContext} from '@playwright/test';

import {PageManager} from 'test/e2e_tests/pages/pageManager';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, removeCreatedTeam} from '../../utils/tearDownUtil';

const owner = getUser();

let memberContext: BrowserContext | undefined;

test.describe('Group Call with Messaging', () => {
  test(
    'Planning group call with sending various messages during call',
    {tag: ['@TC-8632', '@crit-flow-web']},
    async ({browser, api, pages: ownerPageManager}) => {
      test.setTimeout(150_000);

      const member = getUser();
      const teamName = 'Calling';
      const conversationName = 'Calling';

      memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberPageManager = new PageManager(memberPage);

      await test.step('Setup: Create users, invite member, enable conference calling', async () => {
        await api.createTeamOwner(owner, teamName);
        const teamId = await api.team.getTeamIdForUser(owner);
        owner.teamId = teamId;
        addCreatedTeam(owner, teamId);

        const invitationId = await api.team.inviteUserToTeam(member.email, owner);
        const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamId, invitationId);
        await api.createPersonalUser(member, invitationCode);
        await api.enableConferenceCallingFeature(teamId);
      });

      await test.step('Login: Owner and member sign in', async () => {
        await ownerPageManager.openMainPage();
        await ownerPageManager.singleSignOnPage.enterEmailOnSSOPage(owner.email);
        await ownerPageManager.loginPage.inputPassword(owner.password);
        await ownerPageManager.loginPage.clickSignInButton();
        await ownerPageManager.dataShareConsentModal.clickDecline();

        await memberPageManager.openMainPage();
        await memberPageManager.singleSignOnPage.enterEmailOnSSOPage(member.email);
        await memberPageManager.loginPage.inputPassword(member.password);
        await memberPageManager.loginPage.clickSignInButton();
        await memberPageManager.dataShareConsentModal.clickDecline();
      });

      await test.step('Owner creates group and adds the member', async () => {
        await ownerPageManager.conversationListPage.clickCreateGroup();
        await ownerPageManager.groupCreationPage.setGroupName(conversationName);
        await ownerPageManager.startUIPage.selectUsers([member.username]);
        await ownerPageManager.groupCreationPage.clickCreateGroupButton();

        expect(await ownerPageManager.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
      });

      await test.step('Call Flow: Owner starts call', async () => {
        await ownerPageManager.conversationListPage.openConversation(conversationName);
        await ownerPageManager.conversationPage.startCall();
        await ownerPageManager.callingPage.waitForCell();
        expect(await ownerPageManager.callingPage.isCellVisible()).toBeTruthy();
      });

      await test.step('Call Flow: Member joins and goes full screen', async () => {
        await memberPageManager.conversationListPage.openConversation(conversationName);
        await memberPageManager.callingPage.waitForCell();
        expect(await memberPageManager.callingPage.isCellVisible()).toBeTruthy();

        await memberPageManager.callingPage.pickUpIncomingCall();
        expect(await memberPageManager.callingPage.isCellVisible()).toBeTruthy();

        await memberPageManager.callingPage.waitForGoFullScreen();
        expect(await memberPageManager.callingPage.isFullScreenVisible()).toBeFalsy();

        await memberPageManager.callingPage.maximizeCell();
        expect(await memberPageManager.callingPage.isFullScreenVisible()).toBeTruthy();
      });

      await test.step('Call Flow: Owner goes full screen', async () => {
        await ownerPageManager.callingPage.maximizeCell();
        expect(await ownerPageManager.callingPage.isFullScreenVisible()).toBeTruthy();
      });

      await test.step('Validation: Both participants see each other', async () => {
        await ownerPageManager.callingPage.waitForParticipantNameToBeVisible(member.qualifiedId?.id);
        await memberPageManager.callingPage.waitForParticipantNameToBeVisible(owner.qualifiedId?.id);
      });

      await test.step('Validation: Owner sees member is muted', async () => {
        expect(await ownerPageManager.callingPage.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
      });

      await test.step('Member unmutes themselves', async () => {
        await memberPageManager.callingPage.unmuteSelfInFullScreen();
        expect(await memberPageManager.callingPage.isSelfUserMutedInFullScreen()).toBeFalsy();
      });

      await test.step('Validation: Owner sees member is unmuted', async () => {
        expect(await ownerPageManager.callingPage.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
      });
    },
  );

  test.afterAll(async ({api}) => {
    await memberContext?.close();
    await removeCreatedTeam(api, owner);
  });
});
