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
let ownerA = getUser();
const memberA = getUser();
let ownerB = getUser();
const memberB = getUser();

const teamAName = 'Critical A';
const teamBName = 'Critical B';

let memberBPM: PageManager;

// Skipping for now. To be finished in the scope of [WPB-18785]
test.skip('Messages in 1:1', {tag: ['@TC-8750', '@crit-flow-web']}, async ({pageManager, api, browser}) => {
  test.slow(); // Increasing test timeout to 90 seconds to accommodate the full flow

  // Step 0: Preconditions
  await test.step('Preconditions: Creating preconditions for the test via API', async () => {
    // Precondition: Users A and B exist in two separate teams
    const userA = await api.createTeamOwner(ownerA, teamAName);
    ownerA = {...ownerA, ...userA};
    addCreatedTeam(ownerA, ownerA.teamId);
    const invitationIdForMemberA = await api.team.inviteUserToTeam(memberA.email, ownerA);
    const invitationCodeForMemberA = await api.brig.getTeamInvitationCodeForEmail(
      ownerA.teamId,
      invitationIdForMemberA,
    );
    await api.createPersonalUser(memberA, invitationCodeForMemberA);

    const userB = await api.createTeamOwner(ownerB, teamBName);
    ownerB = {...ownerB, ...userB};
    addCreatedTeam(ownerB, ownerB.teamId);

    const invitationIdForMemberB = await api.team.inviteUserToTeam(memberB.email, ownerB);
    const invitationCodeForMemberB = await api.brig.getTeamInvitationCodeForEmail(
      ownerB.teamId,
      invitationIdForMemberB,
    );
    await api.createPersonalUser(memberB, invitationCodeForMemberB);

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
    await pageManager.openMainPage();
    await loginUser(memberA, pageManager);
    await pageManager.webapp.modals.dataShareConsent().clickDecline();

    await pageManager.webapp.pages.conversationList().openConversation(memberB.fullName);

    await memberBPM.openMainPage();
    await loginUser(memberB, memberBPM);
    await memberBPM.webapp.modals.dataShareConsent().clickDecline();
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
