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

import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';

import {test, expect, withLogin} from '../../test.fixtures';

// Fixme: Backoffice does not unlock calling feature for teams created during tests
test.fixme(
  'Planning group call with sending various messages during call',
  {tag: ['@TC-8632', '@crit-flow-web']},
  async ({createTeam, createPage, api}) => {
    test.setTimeout(150_000);

    let owner: User;
    let member: User;
    let ownerPageManager: PageManager;
    let memberPageManager: PageManager;

    const conversationName = 'Calling';

    await test.step('Preconditions: Creating preconditions for the test via API', async () => {
      const team = await createTeam('Calling', {withMembers: 1, enablePaidFeatures: true});
      owner = team.owner;
      member = team.members[0];

      await api.enableConferenceCallingFeature(owner.teamId!);
      await api.waitForFeatureToBeEnabled(FEATURE_KEY.CONFERENCE_CALLING, owner.teamId!, owner.token);

      const [pmOwner, pmMember] = await Promise.all([
        PageManager.from(createPage(withLogin(owner))),
        PageManager.from(createPage(withLogin(member))),
      ]);
      ownerPageManager = pmOwner;
      memberPageManager = pmMember;
    });

    await test.step('Owner creates group and adds the member', async () => {
      const {pages} = ownerPageManager.webapp;
      await pages.conversationList().clickCreateGroup();
      await pages.groupCreation().setGroupName(conversationName);
      await pages.startUI().selectUsers([member.username]);
      await pages.groupCreation().clickCreateGroupButton();

      expect(await pages.conversationList().isConversationItemVisible(conversationName)).toBeTruthy();
    });

    await test.step('Owner starts call', async () => {
      const {pages, components} = ownerPageManager.webapp;
      const ownerCalling = components.calling();
      await pages.conversationList().openConversation(conversationName);
      await pages.conversation().startCall();
      await ownerCalling.waitForCell();

      expect(await ownerCalling.isCellVisible()).toBeTruthy();
    });

    await test.step('Member joins call and goes full screen', async () => {
      const {pages, components} = memberPageManager.webapp;
      const memberCalling = components.calling();
      await pages.conversationList().openConversation(conversationName);
      await memberCalling.waitForCell();
      expect(await memberCalling.isCellVisible()).toBeTruthy();

      await memberCalling.clickAcceptCallButton();
      expect(await memberCalling.isCellVisible()).toBeTruthy();

      expect(await memberCalling.isFullScreenVisible()).toBeFalsy();

      await memberCalling.maximizeCell();
      await memberCalling.waitForGoFullScreen();
      expect(await memberCalling.isFullScreenVisible()).toBeTruthy();
    });

    await test.step('Owner goes full screen', async () => {
      const {components} = ownerPageManager.webapp;
      const ownerCalling = components.calling();
      await ownerCalling.maximizeCell();
      await ownerCalling.waitForGoFullScreen();
      expect(await ownerCalling.isFullScreenVisible()).toBeTruthy();
    });

    await test.step('Validation: Participants see each other', async () => {
      const ownerCalling = ownerPageManager.webapp.components.calling();
      const memberCalling = memberPageManager.webapp.components.calling();
      await ownerCalling.waitForParticipantNameToBeVisible(member.qualifiedId?.id);
      await memberCalling.waitForParticipantNameToBeVisible(owner.qualifiedId?.id);
    });

    await test.step('Validation: Owner sees member is muted', async () => {
      const ownerCalling = ownerPageManager.webapp.components.calling();
      expect(await ownerCalling.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
    });

    await test.step('Member unmutes themselves', async () => {
      const memberCalling = memberPageManager.webapp.components.calling();
      await memberCalling.unmuteSelfInFullScreen();
      await memberPageManager.waitForTimeout(250);
      expect(await memberCalling.isSelfUserMutedInFullScreen()).toBeFalsy();
    });

    await test.step('Validation: Owner sees member is unmuted', async () => {
      const ownerCalling = ownerPageManager.webapp.components.calling();
      expect(await ownerCalling.isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
    });
  },
);
