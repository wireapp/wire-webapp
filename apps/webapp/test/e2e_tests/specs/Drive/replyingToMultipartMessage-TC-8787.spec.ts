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
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {test, expect, withLogin, withConnectedUser} from '../../test.fixtures';
import {createGroup} from '../../utils/userActions';

// User A is a team owner, User B is a team member
let userA: User;
let userB: User;

const teamName = 'Cells Critical Team';
const conversationName = 'Cells Critical Conversation';
const initialMessageText = 'Here is an image for you';
const replyMessageText = 'Nice image, thanks!';

test.beforeEach(async ({createTeam, createUser}) => {
  userB = await createUser();
  const team = await createTeam(teamName, {users: [userB], features: {cells: true}});
  userA = team.owner;
});

const imageFilePath = getImageFilePath();

test(
  'Replying to multipart message in a group conversation',
  {tag: ['@crit-flow-cells', '@regression', '@TC-8787']},
  async ({createPage}) => {
    const [userAPageManager, userBPageManager] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))),
      PageManager.from(createPage(withLogin(userB))),
    ]);

    const {pages: userAPages, components: userAComponents} = userAPageManager.webapp;
    const {pages: userBPages, components: userBComponents} = userBPageManager.webapp;

    await test.step('Preconditions: Create group with drive enabled', async () => {
      await createGroup(userAPages, conversationName, [userB], true);
    });

    await test.step('User A sends a multipart message to User B in a group conversation', async () => {
      await userAPages.conversationList().openConversation(conversationName);
      await userAComponents.inputBarControls().clickShareFile(imageFilePath);
      await userAComponents.inputBarControls().setMessageInput(initialMessageText);
      await userAComponents.inputBarControls().clickSendMessage();
      await userBPages.conversationList().openConversation(conversationName);

      const multipartMessage = userBPages.conversation().getMessage({sender: userA});
      await expect(multipartMessage).toContainText(initialMessageText);
      await expect(multipartMessage.getByRole('button', {name: `Image from ${userA.fullName}`})).toBeVisible();
    });

    await test.step('User B replies to a multipart message', async () => {
      const message = userBPages.cellsConversation().getMessage({sender: userA});
      await userBPages.cellsConversation().replyToMessage(message);
      await userBComponents.inputBarControls().setMessageInput(replyMessageText);
      await userBComponents.inputBarControls().clickSendMessage();

      const reply = userAPages.conversation().getMessage({content: replyMessageText});
      await expect(reply).toBeVisible();
    });
  },
);
