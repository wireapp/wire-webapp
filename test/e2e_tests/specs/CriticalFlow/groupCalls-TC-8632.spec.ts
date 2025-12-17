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

import {PageManager} from 'test/e2e_tests/pageManager';
import {CallingPage} from 'test/e2e_tests/pageManager/webapp/pages/calling.page';
import {createGroup} from 'test/e2e_tests/utils/userActions';

import {test, expect, withLogin} from '../../test.fixtures';

test(
  'Planning group call with sending various messages during call',
  {tag: ['@TC-8632', '@crit-flow-web']},
  async ({createTeam, createPage}) => {
    const team = await createTeam('integrationtest', {withMembers: 1, features: {enterpriseCalling: true}});
    const owner = team.owner;
    const member = team.members[0];

    const [ownerPages, memberPages] = await Promise.all([
      PageManager.from(createPage(withLogin(owner))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(member))).then(pm => pm.webapp.pages),
    ]);
    await createGroup(ownerPages, 'Group Call', [member]);

    await test.step('Owner starts call', async () => {
      await ownerPages.conversationList().openConversation('Group Call');
      await ownerPages.conversation().startCall();
    });

    await test.step('Member joins call and goes full screen', async () => {
      await memberPages.calling().clickAcceptCallButton();
      await memberPages.calling().maximizeCell();
    });

    await test.step('Owner goes full screen', async () => {
      await ownerPages.calling().maximizeCell();
    });

    await test.step('Validation: Participants see each other', async () => {
      await ownerPages.calling().waitForParticipantNameToBeVisible(member.qualifiedId?.id);
      await memberPages.calling().waitForParticipantNameToBeVisible(owner.qualifiedId?.id);
    });

    await test.step('Validation: Owner sees member is muted', async () => {
      await expect(ownerPages.calling().page.locator(CallingPage.selectorForMuteIcon(member.id!))).toBeVisible();
    });

    await test.step('Member unmutes themselves', async () => {
      await memberPages.calling().unmuteSelfInFullScreen();
      await expect(memberPages.calling().fullScreenMuteButton).toBeChecked();
    });

    await test.step('Validation: Owner sees member is unmuted', async () => {
      expect(await ownerPages.calling().isGridTileMuteIconVisibleForUser(member.username)).toBeFalsy();
    });
  },
);
