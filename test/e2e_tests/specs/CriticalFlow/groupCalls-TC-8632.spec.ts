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
import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';

import {PageManager} from 'test/e2e_tests/pageManager';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, removeCreatedTeam} from '../../utils/tearDownUtil';

const owner = getUser();
owner.firstName = 'integrationtest';
owner.lastName = 'integrationtest';
owner.fullName = 'integrationtest';

let memberContext: BrowserContext | undefined;

test(
  'Planning group call with sending various messages during call',
  {tag: ['@TC-8632', '@crit-flow-web']},
  async ({browser, api, pageManager: ownerPageManager}) => {
    test.setTimeout(150_000);

    const member = getUser();
    const teamName = 'Calling';
    const conversationName = 'Calling';

    memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    const memberPageManager = new PageManager(memberPage);

    const ownerPages = ownerPageManager.webapp.pages;
    const memberPages = memberPageManager.webapp.pages;

    const ownerCalling = ownerPageManager.webapp.components.calling();
    const memberCalling = memberPageManager.webapp.components.calling();

    await test.step('Setup: Create users, invite member, enable calling', async () => {
      await api.createTeamOwner(owner, teamName);
      const teamId = await api.team.getTeamIdForUser(owner);
      owner.teamId = teamId;
      addCreatedTeam(owner, teamId);

      const invitationId = await api.team.inviteUserToTeam(member.email, owner);
      const invitationCode = await api.brig.getTeamInvitationCodeForEmail(teamId, invitationId);

      await api.createPersonalUser(member, invitationCode);
      await api.enableConferenceCallingFeature(teamId);
      await api.waitForFeatureToBeEnabled(FEATURE_KEY.CONFERENCE_CALLING, owner.teamId!, owner.token);
    });

    await test.step('Login: Owner and member sign in', async () => {
      await ownerPageManager.openMainPage();
      await loginUser(owner, ownerPageManager);
      await ownerPageManager.webapp.modals.dataShareConsent().clickDecline();

      await memberPageManager.openMainPage();
      await loginUser(member, memberPageManager);
      await memberPageManager.webapp.modals.dataShareConsent().clickDecline();
    });

    await test.step('Owner creates group and adds the member', async () => {
      await ownerPages.conversationList().clickCreateGroup();
      await ownerPages.groupCreation().setGroupName(conversationName);
      await ownerPages.startUI().selectUsers([member.username]);
      await ownerPages.groupCreation().clickCreateGroupButton();

      expect(await ownerPages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('Owner starts call', async () => {
      await ownerPages.conversationList().openConversation(conversationName);
      await ownerPages.conversation().startCall();
      await ownerCalling.waitForCell();
      expect(await ownerCalling.isCellVisible()).toBeTruthy();
    });

    await test.step('Member joins call and goes full screen', async () => {
      await memberPages.conversationList().openConversation(conversationName);
      await memberCalling.waitForCell();
      expect(await memberCalling.isCellVisible()).toBeTruthy();

      await memberCalling.pickUpIncomingCall();
      expect(await memberCalling.isCellVisible()).toBeTruthy();

      await memberCalling.waitForGoFullScreen();
      expect(await memberCalling.isFullScreenVisible()).toBeFalsy();

      await memberCalling.maximizeCell();
      expect(await memberCalling.isFullScreenVisible()).toBeTruthy();
    });

    await test.step('Owner goes full screen', async () => {
      await ownerCalling.maximizeCell();
      expect(await ownerCalling.isFullScreenVisible()).toBeTruthy();
    });

    await test.step('Validation: Participants see each other', async () => {
      await ownerCalling.waitForParticipantNameToBeVisible(member.qualifiedId?.id);
      await memberCalling.waitForParticipantNameToBeVisible(owner.qualifiedId?.id);
    });

    await test.step('Validation: Owner sees member is muted', async () => {
      expect(await ownerCalling.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
    });

    await test.step('Member unmutes themselves', async () => {
      await memberCalling.unmuteSelfInFullScreen();
      expect(await memberCalling.isSelfUserMutedInFullScreen()).toBeFalsy();
    });

    await test.step('Validation: Owner sees member is unmuted', async () => {
      expect(await ownerCalling.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
    });
  },
);

test.afterAll(async ({api}) => {
  await memberContext?.close();
  await removeCreatedTeam(api, owner);
});
