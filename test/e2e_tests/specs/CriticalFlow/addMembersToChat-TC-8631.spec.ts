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

import {Services} from '../../data/serviceInfo';
import {getUser} from '../../data/user';
import {test, expect} from '../../test.fixtures';
import {addCreatedTeam, tearDown} from '../../utils/tearDownUtil';
import {loginUser} from '../../utils/userActions';

test('Team owner adds whole team to an all team chat', {tag: ['@TC-8631', '@crit-flow']}, async ({pages, api}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow
  // Generating test data
  const owner = getUser();
  const member1 = getUser();
  const member2 = getUser();
  const teamName = 'Critical';
  const conversationName = 'Crits';

  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    await api.createTeamOwner(owner, teamName);
    owner.teamId = await api.team.getTeamIdForUser(owner);
    addCreatedTeam(owner, owner.teamId);
    const invitationIdForMember1 = await api.team.inviteUserToTeam(member1.email, owner);
    const invitationCodeForMember1 = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationIdForMember1);

    const invitationIdForMember2 = await api.team.inviteUserToTeam(member2.email, owner);
    const invitationCodeForMember2 = await api.brig.getTeamInvitationCodeForEmail(owner.teamId, invitationIdForMember2);

    await api.createPersonalUser(member1, invitationCodeForMember1);
    await api.createPersonalUser(member2, invitationCodeForMember2);
  });

  await test.step('Team owner logs in into a client and creates group conversation', async () => {
    await loginUser(owner, pages);
  });

  await test.step('Team owner adds a service to newly created group', async () => {
    await api.team.addServiceToTeamWhitelist(owner.teamId!, Services.POLL_SERVICE, owner.token!);
  });

  await test.step('Team owner adds team members to a group', async () => {
    await pages.conversationListPage.clickCreateGroup();
    await pages.groupCreationPage.setGroupName(conversationName);
    await pages.startUIPage.selectUsers([member1.username, member2.username]);
    await pages.groupCreationPage.clickCreateGroupButton();
    expect(await pages.conversationListPage.isConversationItemVisible(conversationName)).toBeTruthy();
  });

  // Steps below require [WPB-18075] and [WPB-17547]

  await test.step('All group participants send messages in a group', async () => {});

  await test.step('Team owner and group members react on received messages with reactions', async () => {});

  await test.step('All group participants make sure they see reactions from other group participants', async () => {});

  await test.step('Team owner removes one group member from a group', async () => {});

  await test.step('Team owner removes a service from a group', async () => {});
});

test.afterAll(async ({api}) => {
  await tearDown(api);
});
