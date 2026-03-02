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

import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';

import {test, expect, withLogin} from '../../test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

let owner: User;
let member: User;
const conversationName = 'Calling';

test.beforeEach(async ({createUser, createTeam}) => {
  member = await createUser();
  const team = await createTeam('Calling', {users: [member], features: {conferenceCalling: true}});
  owner = team.owner;
});

test(
  'Planning group call with sending various messages during call',
  {tag: ['@TC-8632', '@crit-flow-web']},
  async ({createPage}) => {
    const [ownerPageManager, memberPageManager] = await Promise.all([
      PageManager.from(createPage(withLogin(owner))),
      PageManager.from(createPage(withLogin(member))),
    ]);

    await test.step('Owner creates group and adds the member', async () => {
      const {pages} = ownerPageManager.webapp;
      await createGroup(pages, conversationName, [member]);
    });

    await test.step('Owner starts call', async () => {
      const {pages, components} = ownerPageManager.webapp;
      await pages.conversationList().openConversation(conversationName);
      await pages.conversation().startCall();

      await expect(components.calling().callCell).toBeVisible();
    });

    await test.step('Member joins call and goes full screen', async () => {
      const {pages, components} = memberPageManager.webapp;
      await pages.conversationList().openConversation(conversationName);
      const memberCalling = components.calling();
      await expect(memberCalling.callCell).toBeVisible();

      await memberCalling.clickAcceptCallButton();
      await expect(memberCalling.fullScreen).not.toBeVisible();

      await memberCalling.maximizeCell();
      await expect(memberCalling.fullScreen).toBeVisible();
    });

    await test.step('Owner goes full screen', async () => {
      const {components} = ownerPageManager.webapp;
      await components.calling().maximizeCell();
      await expect(components.calling().fullScreen).toBeVisible();
    });

    await test.step('Validation: Participants see each other', async () => {
      const ownerCalling = ownerPageManager.webapp.components.calling();
      const memberCalling = memberPageManager.webapp.components.calling();

      await expect(ownerCalling.getGridTile(member.fullName)).toBeVisible();
      await expect(memberCalling.getGridTile(owner.fullName)).toBeVisible();
    });

    await test.step('Validation: Owner sees member is muted', async () => {
      const ownerCalling = ownerPageManager.webapp.components.calling();
      await expect(ownerCalling.getGridTile(member.fullName).muteIcon).toBeVisible();
    });

    await test.step('Member unmutes themselves', async () => {
      const memberCalling = memberPageManager.webapp.components.calling();
      await memberCalling.unmuteSelfInFullScreen();
      await expect(memberCalling.fullScreenMuteButton).toHaveAttribute('data-uie-value', 'active');
    });

    await test.step('Validation: Owner sees member is unmuted', async () => {
      const ownerCalling = ownerPageManager.webapp.components.calling();
      await expect(ownerCalling.getGridTile(member.fullName).muteIcon).not.toBeVisible();
    });
  },
);
