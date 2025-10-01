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
import {setupBasicTestScenario, startUpApp} from 'test/e2e_tests/utils/setup.util';
import {tearDownAll} from 'test/e2e_tests/utils/tearDown.util';

import {test} from '../../test.fixtures';

test.describe('Block', () => {
  test.slow();

  let owner = getUser();
  const members = Array.from({length: 2}, () => getUser());
  const [memberA] = members;
  const teamName = 'Block';

  test.beforeAll(async ({api}) => {
    const user = await setupBasicTestScenario(api, members, owner, teamName);
    owner = {...owner, ...user};
  });

  test(
    'I want to cancel blocking a 1on1 conversation from conversation list 0',
    {tag: ['@TC-137', '@regression']},
    async ({pageManager}) => {
      // const {components, modals, pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      /**
       * Step 1: Step 2: Step 3: A warning popup should openStep 4: Conversation should be still in conversation list

        2 User A opens the options menu from conversation list
        3 User A selects 'BLOCK' from menu
        4 User A clicks 'Cancel' button
       */
    },
  );

  test(
    'Verify you can block a person from profile view 0',
    {tag: ['@TC-140', '@regression']},
    async ({pageManager}) => {
      // const {components, modals, pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      /**
       *
       *  Go to 1:1 conversation
        Step 1: NULLStep 2: Step 3: Verify you are presented with  confirmation dialog  where you can cancel blocking
        Verify you are redicreted back to the contact list after the person is blocked
        Verify the conversation with the blocked person disappears from the main and archived contact lists
        Verify the next list conversation is activated

        2 Open profile view

        3 Tap 'Block'
       */
    },
  );

  test(
    'Verify you still receive messages from blocked person in a group chat 0',
    {tag: ['@TC-141', '@regression']},
    async ({pageManager}) => {
      // const {components, modals, pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      /**
       *Log in as user A and write several messages into group conversation, where user B is participated
          Step 1:
          Step 2:
          Step 3:
          Step 4: Verify that all messages written prior and after blocking were successfully received by user B
          Step 5:
          Step 6: Verify that all messages written by UserB are recieved in group conversation.
          2 Block user B being logged in as user A
          3 Write more messages into the same group conversation
          4 log in under user B
          5 Write more messages into same group conversation
          6 Login as userA
       */
    },
  );

  test('Verify you can block and unblock user in 1on1 0', {tag: ['@TC-142', '@regression']}, async ({pageManager}) => {
    // const {components, modals, pages} = pageManager.webapp;
    await startUpApp(pageManager, memberA);

    /**
     * Log in as user A and write several messages in 1:1 chat to user B
      Step 1: NULL
      Step 2: NULL
      Step 3: Verify that all messages written prior blocking were successfully received by user B
      Step 4: Verify all messages were successfully sent
      Step 5: Verify you don't get any messages/notifications from user B
      Step 6: Verify you get all the messages written by user A while he was blocked
      Step 7: Verify user B received all messages written by user A
      Step 8: Verify all messages were successfully sent
      Step 9: Verify user A successfully received all messages from user B

      2 Block a user B being logged in as user A
      3 Log in under user B
      4 Write messages to user A
      5 Log in as user A
      6 Unblock user B and write several messages to user B
      7 Log in as user B
      8 Write several messages to user A
      9 Log in as user A
     */
  });
  test(
    'Verify you cannot add a person who blocked you to a group chat 0',
    {tag: ['@TC-143', '@regression']},
    async ({pageManager}) => {
      // const {components, modals, pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      /**
       *
       */
    },
  );
  test(
    'Verify you can block a user you sent a connection request from conversation list 0',
    {tag: ['@TC-144', '@regression']},
    async ({pageManager}) => {
      // const {components, modals, pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      /**
       *
       */
    },
  );
  test(
    'Verify I can block a 1on1 conversation from conversation list 0',
    {tag: ['@TC-145', '@regression']},
    async ({pageManager}) => {
      // const {components, modals, pages} = pageManager.webapp;
      await startUpApp(pageManager, memberA);

      /**
       *Create 1:1 conversation with user A and user B
      Step 1:
      Step 2:
      Step 3: A warning popup should open
      Step 4: Expect same behaviour as block:
      Verify the conversation with the blocked person disappears from the main and archived contact lists Verify the next list conversation is activated
      Step 5: Conversation should not be unarchived for user A
      Step 6: User B should still have the conversation in the list
      Step 7: No leave message is displayed

      2 User A opens the options menu from conversation list
      3 User A selects 'BLOCK' from menu
      4 User A clicks on 'Block' button on warning dialog
      5 User B sends a message
      6 Login as user B
      7 Open conversation with User A


       */
    },
  );

  test('Verify you can unblock someone from search list', {tag: ['@TC-148', '@regression']}, async ({pageManager}) => {
    // const {components, modals, pages} = pageManager.webapp;
    await startUpApp(pageManager, memberA);

    /**
     *
     */
  });

  test.afterAll(async ({api}) => {
    await tearDownAll(api);
  });
});
