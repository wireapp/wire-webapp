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

import {getUser} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDownUtil';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {test} from '../../test.fixtures';

// Generating test data
const ownerA = getUser();
const memberA = getUser();
const ownerB = getUser();
const memberB = getUser();

const teamAName = 'Critical A';
const teamBName = 'Critical B';

let memberBPM: PageManager;

test('Messages in 1:1', {tag: ['@TC-8750', '@crit-flow-web']}, async ({pm, api, browser}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  // Step 0: Preconditions
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    // Precondition: Users A and B exist in two separate teams
    await api.createTeamOwner(ownerA, teamAName);
    ownerA.teamId = await api.team.getTeamIdForUser(ownerA);
    const invitationIdForMemberA = await api.team.inviteUserToTeam(memberA.email, ownerA);
    const invitationCodeForMemberA = await api.brig.getTeamInvitationCodeForEmail(
      ownerA.teamId,
      invitationIdForMemberA,
    );
    await api.createPersonalUser(memberA, invitationCodeForMemberA);
    addCreatedTeam(ownerA, ownerA.teamId);

    await api.createTeamOwner(ownerB, teamBName);
    ownerB.teamId = await api.team.getTeamIdForUser(ownerB);

    const invitationIdForMemberB = await api.team.inviteUserToTeam(memberB.email, ownerB);
    const invitationCodeForMemberB = await api.brig.getTeamInvitationCodeForEmail(
      ownerB.teamId,
      invitationIdForMemberB,
    );
    await api.createPersonalUser(memberB, invitationCodeForMemberB);
    addCreatedTeam(ownerB, ownerB.teamId);

    // Precondition: Users A and B are connected
    if (!memberA.token) {
      throw new Error(`Member A ${memberA.username} has no token and can't be used for connection`);
    }
    if (!memberB.qualifiedId?.id.length) {
      throw new Error(`Member B ${memberB.username} has no qualifiedId and can't be used for connection`);
    }
    await api.connection.sendConnectionRequest(memberA.token, memberB.qualifiedId.id);
    await api.acceptConnectionRequest(memberB);

    // Create context for member B
    const memberBContext = await browser.newContext();
    const memberBPage = await memberBContext.newPage();
    memberBPM = new PageManager(memberBPage);
  });

  // Step 1: Log in as the users and open the 1:1
  await test.step('Log in as the users and open the 1:1', async () => {
    await loginUser(memberA, pm);
    await pm.webapp.pages.conversationList().openConversation(memberB.fullName);

    await loginUser(memberB, memberBPM);
  });

  // Step 2: Images
  await test.step('User A sends image', async () => {});
  await test.step('User B can open the image preview and can download the image', async () => {});

  // Step 3: Reactions
  await test.step('User B reacts to A’s image', async () => {});
  await test.step('User A can see the reaction', async () => {});

  // Step 4: Video Files
  await test.step('User A sends video message', async () => {});
  await test.step('User B can play the message', async () => {});

  // Step 5L Audio Files
  await test.step('User A sends audio file', async () => {});
  await test.step('User B can play the file', async () => {});

  // Step 6: Ephemeral messages
  await test.step('User A sends a quick (10 sec) self deleting message', async () => {});
  await test.step('User B sees the message', async () => {});

  // Step 7: Message removal
  await test.step('User B waits 10 seconds', async () => {});
  await test.step('Both users see the message as removed', async () => {});

  // Step 8: Asset sharing
  await test.step('User A sends asset', async () => {});
  await test.step('User B can download the file', async () => {});
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, ownerA);
  await removeCreatedTeam(api, ownerB);
});
