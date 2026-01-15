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
import {addMockCamerasToContext} from 'test/e2e_tests/utils/mockVideoDevice.util';
import {addCreatedTeam, removeCreatedTeam} from 'test/e2e_tests/utils/tearDown.util';
import {loginUser} from 'test/e2e_tests/utils/userActions';

import {expect, test} from '../test.fixtures';
import {makeNetworkOffline, makeNetworkOnline} from '../utils/network.util';

let ownerA = getUser();
let ownerB = getUser();

const teamAName = 'Direct Call A';
const teamBName = 'Direct Call B';

test('Starting call 1:1 call without internet', async ({browser, pageManager: ownerAPageManager, api}) => {
  test.setTimeout(150_000);

  const {pages: ownerAPages, modals: ownerAModals, components: ownerAComponents} = ownerAPageManager.webapp;

  await addMockCamerasToContext(ownerAPageManager.getContext());

  const ownerBContext = await browser.newContext();
  const ownerBPage = await ownerBContext.newPage();
  const ownerBPageManager = PageManager.from(ownerBPage);
  const {pages: ownerBPages, modals: ownerBModals, components: ownerBComponents} = ownerBPageManager.webapp;
  const ownerBCalling = ownerBComponents.calling();

  await test.step('Preconditions: Creating two separate teams and users via API', async () => {
    const user = await api.createTeamOwner(ownerA, teamAName);
    ownerA = {...ownerA, ...user};
    addCreatedTeam(ownerA, ownerA.teamId!);
    await api.enableConferenceCallingFeature(ownerA.teamId!);

    const userB = await api.createTeamOwner(ownerB, teamBName);
    ownerB = {...ownerB, ...userB};
    addCreatedTeam(ownerB, ownerB.teamId!);
    await api.enableConferenceCallingFeature(ownerB.teamId!);
  });

  await test.step('Users A and B are logged in', async () => {
    await Promise.all([
      (async () => {
        await ownerAPageManager.openMainPage();
        await loginUser(ownerA, ownerAPageManager);
        await ownerAModals.dataShareConsent().clickDecline();
      })(),

      (async () => {
        await ownerBPageManager.openMainPage();
        await loginUser(ownerB, ownerBPageManager);
        await ownerBModals.dataShareConsent().clickDecline();
      })(),
    ]);
  });

  // user A finds user B and sends a connection request
  await test.step('User A connects with User B', async () => {
    await ownerAComponents.conversationSidebar().clickConnectButton();
    await ownerAPages.startUI().searchInput.fill(ownerB.username);
    await ownerAPages.startUI().selectUsers(ownerB.username);
    await ownerAModals.userProfile().clickConnectButton();

    expect(await ownerAPages.conversationList().isConversationItemVisible(ownerB.fullName));
    await expect(ownerBPage).toHaveTitle('(1) Wire');

    await ownerBPages.conversationList().openPendingConnectionRequest();
    await ownerBPages.connectRequest().clickConnectButton();
  });

  await test.step('User A calls User B', async () => {
    try {
      await api.callingService.createInstance(ownerB.password, ownerB.email);
      await makeNetworkOffline(ownerAPageManager);
      await ownerAPages.conversation().startCall();
      expect(await ownerAModals.callNotEstablished().isModalPresent());
      expect(await ownerAModals.callNotEstablished().getModalTitle()).toContain('Call not established');
      await ownerAModals.callNotEstablished().clickOk();
    } catch (error) {
      console.error('Error during call initiation:', error);
      throw error;
    }
  });

  await test.step('User A enables internet and calls User B successfully', async () => {
    await makeNetworkOnline(ownerAPageManager);

    await ownerAPages.conversation().startCall();

    await ownerAPages.calling().waitForCell();
    expect(await ownerAPages.calling().isCellVisible()).toBeTruthy();
  });

  await test.step('Owner B tries to joins call call while offline', async () => {
    await ownerBCalling.waitForCell();

    await makeNetworkOffline(ownerBPageManager);
    await ownerBPages.conversation().startCall();
    expect(await ownerBModals.callNotEstablished().isModalPresent());
    expect(await ownerBModals.callNotEstablished().getModalTitle()).toContain('Call not established');
    await ownerBModals.callNotEstablished().clickOk();
  });

  await test.step('Owner B tries to joins call call while offline', async () => {
    await makeNetworkOnline(ownerBPageManager);

    expect(await ownerBCalling.isCellVisible()).toBeTruthy();

    await ownerBCalling.clickAcceptCallButton();
    expect(await ownerBCalling.isCellVisible()).toBeTruthy();

    await ownerBCalling.waitForGoFullScreen();
    expect(await ownerBCalling.isFullScreenVisible()).toBeFalsy();

    await ownerBCalling.maximizeCell();
    expect(await ownerBCalling.isFullScreenVisible()).toBeTruthy();
  });
});

test.afterAll(async ({api}) => {
  await removeCreatedTeam(api, ownerA);
  await removeCreatedTeam(api, ownerB);
});
