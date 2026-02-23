import {test, expect, withLogin} from 'test/e2e_tests/test.fixtures';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Mention', () => {
  let userA: User;
  let userB: User;
  let userC: User;

  test.beforeEach(async ({createUser, createTeam}) => {
    [userB, userC] = await Promise.all([createUser(), createUser()]);
    const team = await createTeam('Test Team', {users: [userB, userC]});
    userA = team.owner;
  });

  test('I want to be able to write a mention in a group', {tag: ['@TC-3487', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);
    await createGroup(userAPages, 'Mention Group', [userB]);

    // User A sends a message with a mention
    await userAPages.conversationList().openConversation('Mention Group');
    await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hey');

    // User B receives the message
    await userBPages.conversationList().openConversation('Mention Group');
    const messageOnUserB = userBPages.conversation().getMessage({content: 'Hey', sender: userA});
    await expect(messageOnUserB).toBeVisible();
    const mentionOnUserB = messageOnUserB.getByRole('button', {name: `@${userB.fullName}`});
    await expect(mentionOnUserB).toBeVisible();
  });

  test(
    'I want to mention multiple people in the same message',
    {tag: ['@TC-3488', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, 'Multi-Mention Group', [userB, userC]);
      await userBPages.conversationList().openConversation('Multi-Mention Group');
      await userCPages.conversationList().openConversation('Multi-Mention Group');

      // User A sends a message with multiple mentions
      await userAPages.conversationList().openConversation('Multi-Mention Group');
      const conversationPageA = userAPages.conversation();

      await conversationPageA.messageInput.fill('Hello ');
      await conversationPageA.mentionUser(userB.fullName);
      await conversationPageA.messageInput.pressSequentially(' and ');
      await conversationPageA.mentionUser(userC.fullName);
      await conversationPageA.messageInput.press('Enter');

      for (const page of [userAPages, userBPages, userCPages]) {
        const message = page.conversation().getMessage({content: 'Hello', sender: userA});
        await expect(message).toBeVisible();
        await expect(message.getByRole('button', {name: `@${userB.fullName}`})).toBeVisible();
        await expect(message.getByRole('button', {name: `@${userC.fullName}`})).toBeVisible();
      }
    },
  );

  test(
    'I want to be able to edit already sent message with a mention and mention someone else',
    {tag: ['@TC-3489', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages, userCPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userC))).then(pm => pm.webapp.pages),
      ]);

      await test.step('Create group', async () => {
        await createGroup(userAPages, 'Edit-Mention Group', [userB, userC]);
        await userAPages.conversationList().openConversation('Edit-Mention Group');
        await userBPages.conversationList().openConversation('Edit-Mention Group');
        await userCPages.conversationList().openConversation('Edit-Mention Group');
      });

      await test.step('User A sends an initial message mentioning userB', async () => {
        await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hello');

        for (const page of [userAPages, userBPages, userCPages]) {
          const message = page.conversation().getMessage({content: 'Hello', sender: userA});
          await expect(message).toBeVisible();
          await expect(message.getByRole('button', {name: `@${userB.fullName}`})).toBeVisible();
        }
      });

      await test.step('User A edits the message, changing the mention to userC', async () => {
        const initialMessageOnUserA = userAPages.conversation().getMessage({content: 'Hello', sender: userA});
        await userAPages.conversation().editMessage(initialMessageOnUserA);
        await expect(userAPages.conversation().messageInput).toContainText(`@${userB.fullName} Hello`);

        await userAPages.conversation().messageInput.fill(''); // Clear previous content
        await userAPages.conversation().mentionUser(userC.fullName);
        await userAPages.conversation().messageInput.pressSequentially(' new greeting');
        await userAPages.conversation().messageInput.press('Enter');
      });

      await test.step('Verify the edited message on all users', async () => {
        for (const page of [userAPages, userBPages, userCPages]) {
          const message = page.conversation().getMessage({content: 'new greeting', sender: userA});
          await expect(message).toBeVisible();
          await expect(message.getByRole('button', {name: `@${userC.fullName}`})).toBeVisible();
          await expect(message.getByRole('button', {name: `@${userB.fullName}`})).not.toBeVisible();
        }
      });
    },
  );

  test('I want to be able to write a mention in a 1:1', {tag: ['@TC-3490', '@regression']}, async () => {});

  test('I want to send an ephemeral message with a mention', {tag: ['@TC-3491', '@regression']}, async () => {});

  test(
    'I want to mention the same person twice in the same message',
    {tag: ['@TC-3492', '@regression']},
    async () => {},
  );

  test(
    'I want mention to be shown as a full name even if I searched by username',
    {tag: ['@TC-3493', '@regression']},
    async () => {},
  );

  test(
    'I want to see the mentions in my profile color in the input field',
    {tag: ['@TC-3494', '@regression']},
    async () => {},
  );

  test(
    'I should not loose drafted text or mentions in input field',
    {tag: ['@TC-3498', '@regression']},
    async () => {},
  );

  test('I want to receive a message containing a mention', {tag: ['@TC-3521', '@regression']}, async () => {});

  test(
    'I want to see a subtitle in the conversation list when there is one or more unread mentions in the conversation',
    {tag: ['@TC-3528', '@regression']},
    async () => {},
  );

  test(
    'I want to see mention icon when I have unread mention, messages, pings and calls in a conversation',
    {tag: ['@TC-3529', '@regression']},
    async () => {},
  );

  test(
    'I should not see mention indicator in the conversation list if the sender recalls the mention message to me',
    {tag: ['@TC-3530', '@regression']},
    async () => {},
  );

  test(
    'I want to see normal text message (without mention link) when I did not select someone from mention suggestion',
    {tag: ['@TC-3531', '@regression']},
    async () => {},
  );

  test(
    'I should not see mentions suggestion if I type @ with characters in front',
    {tag: ['@TC-3532', '@regression']},
    async () => {},
  );

  test(
    'I should not see suggestions of people who are not in the group chat',
    {tag: ['@TC-3533', '@regression']},
    async () => {},
  );

  test(
    'I want to see all group participant list when I tap or type @',
    {tag: ['@TC-3535', '@regression']},
    async () => {},
  );

  test(
    'I want to mention a name with or without umlaut gives the same suggestion (query normalization)',
    {tag: ['@TC-3537', '@regression']},
    async () => {},
  );

  test('I want to see guest indicators in the suggestions list', {tag: ['@TC-3540', '@regression']}, async () => {});

  test(
    'I want to be able to mention participants I am not connected to',
    {tag: ['@TC-3545', '@regression']},
    async () => {},
  );

  test(
    'I should not be able to mention a person who left/was removed (from) a conversation',
    {tag: ['@TC-3546', '@regression']},
    async () => {},
  );
});
