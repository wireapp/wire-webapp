import {
  test,
  expect,
  withLogin,
  withConnectedUser,
  Team,
  withGuestUser,
  withConnectionRequest,
} from 'test/e2e_tests/test.fixtures';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Mention', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;

  test.beforeEach(async ({createUser, createTeam}) => {
    [userB, userC] = await Promise.all([createUser(), createUser()]);
    team = await createTeam('Test Team', {users: [userB, userC]});
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

  test('I want to be able to write a mention in a 1:1', {tag: ['@TC-3490', '@regression']}, async ({createPage}) => {
    const [userAPages, userBPages] = await Promise.all([
      PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
      PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
    ]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

    await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hello');

    for (const page of [userAPages, userBPages]) {
      const message = page.conversation().getMessage({content: 'Hello', sender: userA});
      await expect(message).toBeVisible();
      await expect(message.getByRole('button', {name: `@${userB.fullName}`})).toBeVisible();
    }
  });

  test(
    'I want to send an ephemeral message with a mention',
    {tag: ['@TC-3491', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      // User A sends a self deleting message with a mention
      await userAPages.conversation().enableSelfDeletingMessages();
      await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Ephemeral mention');

      // Verify message and mention on user B's side
      const messageOnUserB = userBPages.conversation().getMessage({content: 'Ephemeral mention', sender: userA});
      await expect(messageOnUserB).toBeVisible();
      await expect(messageOnUserB.getByRole('button', {name: `@${userB.fullName}`})).toBeVisible();

      // Wait for the message to be deleted (10 seconds as per default setting)
      await userBPage.waitForTimeout(10_000);

      // Verify message is no longer visible on user B's side
      await expect(messageOnUserB).not.toBeVisible();
    },
  );

  test(
    'I want to mention the same person twice in the same message',
    {tag: ['@TC-3492', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      // User A sends a message with the same person mentioned twice
      const conversationPageA = userAPages.conversation();
      await conversationPageA.messageInput.fill('Hi ');
      await conversationPageA.mentionUser(userB.fullName);
      await conversationPageA.messageInput.pressSequentially(' check this out ');
      await conversationPageA.mentionUser(userB.fullName);
      await conversationPageA.messageInput.press('Enter');

      for (const page of [userAPages, userBPages]) {
        const message = page.conversation().getMessage({content: 'check this out', sender: userA});
        await expect(message).toBeVisible();
        const mentions = message.getByRole('button', {name: `@${userB.fullName}`});
        await expect(mentions).toHaveCount(2);
      }
    },
  );

  test(
    'I want mention to be shown as a full name even if I searched by username',
    {tag: ['@TC-3493', '@regression']},
    async ({createPage}) => {
      const userAPages = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB))).webapp.pages;
      await userAPages.conversationList().openConversation(userB.fullName);

      const conversationPageA = userAPages.conversation();
      await conversationPageA.messageInput.fill(''); // Clear input
      await conversationPageA.mentionUser(userB.fullName, userB.username); // Search by username, but expect full name
      await conversationPageA.messageInput.pressSequentially(' tested it');
      await conversationPageA.messageInput.press('Enter');

      // Verify on user A's side that the mention is the full name
      const messageOnUserA = conversationPageA.getMessage({content: 'tested it'});
      await expect(messageOnUserA).toBeVisible();
      await expect(messageOnUserA.getByRole('button', {name: `@${userB.fullName}`})).toBeVisible();
      await expect(messageOnUserA.getByRole('button', {name: `@${userB.username}`})).not.toBeVisible(); // Assert it's not the username
    },
  );

  test(
    'I want to see the mentions in my profile color in the input field',
    {tag: ['@TC-3494', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)).then(page => PageManager.from(page).webapp.pages),
        createPage(withLogin(userB)).then(page => PageManager.from(page).webapp.pages),
      ]);
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      const conversationPageA = userAPages.conversation();

      await conversationPageA.messageInput.fill(''); // Clear input
      await conversationPageA.mentionUser(userB.fullName);

      // Assert the color of the mention in the input field for user A
      const mentionInInputField = conversationPageA.messageInput.getByTestId('item-input-mention');
      await expect(mentionInInputField).toContainText(`@${userB.fullName}`);
      await expect(mentionInInputField).toHaveCSS('color', 'rgb(6, 103, 200)');

      await conversationPageA.messageInput.press('Enter');

      // Assert the background color of the mention in the received message for user B
      const messageOnUserB = userBPages.conversation().getMessage({sender: userA});
      await expect(messageOnUserB).toBeVisible();
      await expect(messageOnUserB.getByRole('button', {name: `@${userB.fullName}`})).toHaveCSS(
        'background-color',
        'rgb(155, 194, 233)',
      );
    },
  );

  test(
    'I should not loose drafted text or mentions in input field',
    {tag: ['@TC-3498', '@regression']},
    async ({createPage}) => {
      const userAPages = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;
      await createGroup(userAPages, 'Draft Group', [userB]);

      const conversationPageA = userAPages.conversation();
      await test.step('Draft a message with a mention in the group chat', async () => {
        await userAPages.conversationList().openConversation('Draft Group');
        await conversationPageA.messageInput.fill('Draft message with ');
        await conversationPageA.mentionUser(userB.fullName);

        const mentionInInputField = conversationPageA.messageInput.getByTestId('item-input-mention');
        await expect(mentionInInputField).toBeVisible();
      });

      await test.step('Switch to the 1:1 chat', async () => {
        await userAPages.conversationList().openConversation(userB.fullName);
        await expect(conversationPageA.messageInput).toBeEmpty();
      });

      await test.step('Switch back to the group chat and verify the draft with the mention is preserved', async () => {
        await userAPages.conversationList().openConversation('Draft Group');
        await expect(conversationPageA.messageInput).toHaveText(`Draft message with @${userB.fullName}`);

        const preservedMention = conversationPageA.messageInput.getByTestId('item-input-mention');
        await expect(preservedMention).toBeVisible();
        await expect(preservedMention).toContainText(`@${userB.fullName}`);
      });
    },
  );

  test('I want to receive a message containing a mention', {tag: ['@TC-3521', '@regression']}, async ({createPage}) => {
    const userBPages = await PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages);
    const userAPages = await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

    // User A sends a message with a mention to User B
    await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hello');

    // User B verifies the received message and mention
    const receivedMessage = userBPages.conversation().getMessage({content: 'Hello', sender: userA});
    await expect(receivedMessage).toBeVisible();

    const mentionInMessage = receivedMessage.getByRole('button', {name: `@${userB.fullName}`});
    await expect(mentionInMessage).toBeVisible();
  });

  test(
    'I want to see a subtitle in the conversation list when there is one or more unread mentions in the conversation',
    {tag: ['@TC-3528', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      // Create and open a group conversation for userB to ensure the message from A won't be read immediately
      await createGroup(userBPages, 'Distraction Group', [userC]);
      await userBPages.conversationList().openConversation('Distraction Group');

      // User A opens conversation with user B and sends a message with mention
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hey, you have an unread mention!');

      // User B is in the 'Distraction Group', so the conversation with user A is unread.
      // Now check for the mention indicator in the conversation list.
      const {mentionIndicator} = userBPages.conversationList().getConversationLocator(userA.fullName);
      await expect(mentionIndicator).toBeVisible();
    },
  );

  test(
    'I want to see mention icon when I have unread mention, messages, pings and calls in a conversation',
    {tag: ['@TC-3529', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await test.step('Create and open a distraction group conversation for User B', async () => {
        // userA creates the group, userB opens it. This is the distraction.
        await createGroup(userAPages, 'Distraction Group', [userB]);
        await userBPages.conversationList().openConversation('Distraction Group');
      });

      await test.step('User A tries to call User B in 1:1 conversation but B declines', async () => {
        await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
        await userAPages.conversation().startCall();
        await userBPages.calling().leaveCallButton.click();
        await userAPages.calling().leaveCallButton.click();
      });

      await test.step('User A sends a plain message to User B in 1:1 conversation', async () => {
        await userAPages.conversation().sendMessage('Hello, this is a plain message.');
      });

      await test.step('User A sends a message with a mention to User B in 1:1 conversation', async () => {
        await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hey, you have an unread mention!');
      });

      await test.step('User A sends a ping to User B in 1:1 conversation', async () => {
        await userAPages.conversation().sendPing();
      });

      await test.step('Verify User B sees both unread mention and unread message indicators for 1:1 conversation', async () => {
        const {mentionIndicator} = userBPages.conversationList().getConversationLocator(userA.fullName);
        await expect(mentionIndicator).toBeVisible();
      });
    },
  );

  test(
    'I should not see mention indicator in the conversation list if the sender recalls the mention message to me',
    {tag: ['@TC-3530', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await createGroup(userAPages, 'Test Group', [userB]);
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation('Test Group');

      await userAPages.conversation().sendMessageWithUserMention(userB.fullName);
      const {mentionIndicator} = userBPages.conversationList().getConversationLocator(userA.fullName);
      await expect(mentionIndicator).toBeVisible();

      await userAPages.conversation().deleteMessage(userAPages.conversation().getMessage({sender: userA}), 'Everyone');
      await expect(mentionIndicator).not.toBeAttached();
    },
  );

  test(
    'I want to see normal text message (without mention link) when I did not select someone from mention suggestion',
    {tag: ['@TC-3531', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB), withConnectedUser(userA))).then(pm => pm.webapp.pages),
      ]);

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage(`@${userB.fullName} Hello`);

      for (const pages of [userAPages, userBPages]) {
        const message = pages.conversation().getMessage({sender: userA});
        await expect(message).toContainText(`@${userB.fullName}`);
        await expect(message.getByRole('button', {name: `@${userB.fullName}`})).not.toBeAttached();
      }
    },
  );

  test(
    'I should not see mentions suggestion if I type @ with characters in front',
    {tag: ['@TC-3532', '@regression']},
    async ({createPage}) => {
      const {pages} = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB))).webapp;
      await pages.conversationList().openConversation(userB.fullName);

      await pages.conversation().messageInput.pressSequentially(`test@${userB.firstName}`);
      await expect(pages.conversation().mentionSuggestions).toHaveCount(0);
    },
  );

  test(
    'I should not see suggestions of people who are not in the group chat',
    {tag: ['@TC-3533', '@regression']},
    async ({createPage}) => {
      const {pages} = PageManager.from(await createPage(withLogin(userA))).webapp;

      await createGroup(pages, 'Test Group', [userB]);
      await pages.conversationList().openConversation('Test Group');

      // It should be possible to mention userB as he's part of the group
      await pages.conversation().messageInput.pressSequentially(`@${userB.firstName}`);
      await expect(pages.conversation().mentionSuggestions).toHaveCount(1);

      // There should not be a suggestion for userC who's not part of the group
      await pages.conversation().messageInput.fill('');
      await pages.conversation().messageInput.pressSequentially(`@${userC.firstName}`);
      await expect(pages.conversation().mentionSuggestions).toHaveCount(0);
    },
  );

  test(
    'I want to see all group participant list when I tap or type @',
    {tag: ['@TC-3535', '@regression']},
    async ({createPage}) => {
      const {pages} = PageManager.from(await createPage(withLogin(userA))).webapp;

      await createGroup(pages, 'Test Group', [userB, userC]);
      await pages.conversationList().openConversation('Test Group');

      // It should be possible to mention userB as he's part of the group
      await pages.conversation().messageInput.pressSequentially(`@`);
      await expect(pages.conversation().mentionSuggestions).toHaveCount(2);
      await expect(pages.conversation().mentionSuggestions.filter({hasText: userB.fullName})).toBeVisible();
      await expect(pages.conversation().mentionSuggestions.filter({hasText: userC.fullName})).toBeVisible();
    },
  );

  test(
    'I want to mention a name with or without umlaut gives the same suggestion (query normalization)',
    {tag: ['@TC-3537', '@regression']},
    async ({createUser, createPage}) => {
      const memberWithStrangeName = await createUser({firstName: 'Günter'});
      await team.addTeamMember(memberWithStrangeName);

      const {pages} = PageManager.from(await createPage(withLogin(userA))).webapp;
      await createGroup(pages, 'Test Group', [memberWithStrangeName]);
      await pages.conversationList().openConversation('Test Group');

      await pages.conversation().messageInput.pressSequentially('@Gunter');
      await expect(pages.conversation().mentionSuggestions).toHaveCount(1);
      await expect(pages.conversation().mentionSuggestions).toContainText(memberWithStrangeName.fullName);
    },
  );

  test(
    'I want to see guest indicators in the suggestions list',
    {tag: ['@TC-3540', '@regression']},
    async ({createPage}) => {
      const {pages} = PageManager.from(await createPage(withLogin(userA))).webapp;
      await createGroup(pages, 'Test Group', []);

      await test.step('Create guest link for group & join as guest user', async () => {
        await pages.conversationList().openConversation('Test Group');
        await pages.conversation().clickConversationTitle();
        const link = await pages.conversationDetails().createGuestLink();
        await createPage(withGuestUser(link, 'Guest User'));
      });

      await test.step('Verify the temporary user is shown as group member', async () => {
        const guestMember = pages.conversationDetails().groupMembers.filter({hasText: 'Guest User'});
        // It may take a moment until the login is done and the user joined
        await expect(guestMember).toBeVisible({timeout: 60_000});
      });

      await test.step('Verify the mention suggestion for the guest has a "guest" indicator', async () => {
        await pages.conversation().messageInput.pressSequentially('@Guest');
        await expect(pages.conversation().mentionSuggestions).toHaveCount(1);
        await expect(pages.conversation().mentionSuggestions.getByTestId('status-guest')).toBeVisible();
      });
    },
  );

  test(
    'I want to be able to mention participants I am not connected to',
    {tag: ['@TC-3545', '@regression']},
    async ({createUser, createPage}) => {
      const otherUser = await createUser();
      const otherUserPages = await PageManager.from(createPage(withLogin(otherUser))).then(pm => pm.webapp.pages);

      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(otherUser))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      await otherUserPages.conversationList().pendingConnectionRequest.click();
      await otherUserPages.connectRequest().connectButton.click();
      
      await test.step('UserA creates a group including userB and otherUser', async () => {
        await createGroup(userAPages, 'Test Group', [userB, otherUser]);
      });

      await test.step("UserB mentions otherUser in the group although they're not connected", async () => {
        await userBPages.conversationList().openConversation('Test Group');
        await userBPages.conversation().sendMessageWithUserMention(otherUser.fullName);
      });

      await test.step('OtherUser receives the message from userB including the mention', async () => {
        await otherUserPages.conversationList().openConversation('Test Group');
        const mentionInMessage = otherUserPages
          .conversation()
          .getMessage({sender: userB})
          .getByRole('button', {name: `@${otherUser.fullName}`});
        await expect(mentionInMessage).toBeVisible();
      });
    },
  );

  test(
    'I should not be able to mention a person who left/was removed (from) a conversation',
    {tag: ['@TC-3546', '@regression']},
    async ({createPage}) => {
      const userAPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;
      await createGroup(userAPages, 'Test Group', [userB, userC]);

      await test.step('UserA removes userB from the group', async () => {
        await userAPages.conversationList().openConversation('Test Group');
        await userAPages.conversation().conversationTitle.click();
        await userAPages.conversationDetails().openParticipantDetails(userB.fullName);
        await userAPages.participantDetails().removeFromGroup();
      });

      await test.step("UserA tries to mention userB but he's not in the suggestions", async () => {
        await userAPages.conversation().messageInput.pressSequentially('@');
        await expect(userAPages.conversation().mentionSuggestions).toHaveCount(1);
        await expect(userAPages.conversation().mentionSuggestions).not.toContainText(userB.fullName);
      });
    },
  );
});
