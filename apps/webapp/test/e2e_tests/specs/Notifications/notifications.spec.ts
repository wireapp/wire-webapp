import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {interceptNotifications} from 'test/e2e_tests/utils/mockNotifications.util';
import {test, withLogin, withConnectedUser, expect} from 'test/e2e_tests/test.fixtures';
import {createGroup, sendConnectionRequest} from 'test/e2e_tests/utils/userActions';
import {shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';

test.describe('Notifications', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Test Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test('I want to receive notifications for mentions', {tag: ['@TC-3499', '@regression']}, async ({createPage}) => {
    const [userAPage, userBPage] = await Promise.all([
      createPage(withLogin(userA), withConnectedUser(userB)),
      createPage(withLogin(userB)),
    ]);
    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    // Create group so B can open it while A sends the message so a notification will be sent for it
    await createGroup(userAPages, 'Test Group', [userB]);
    await userBPages.conversationList().openConversation('Test Group');

    // Start intercepting notifications
    const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

    // Send message from A to B in 1on1 conversation
    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hello');

    // Check the notifications B received to contain the message from A
    await expect
      .poll(() => getUserBNotifications())
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: userA.fullName,
            body: `Mention: @${userB.fullName} Hello`,
          }),
        ]),
      );
  });

  // WPB-21966 - This test is currently broken as the user receives notifications even for archived conversations
  test.fixme(
    'I should not receive notifications for archived conversations',
    {tag: ['@TC-8760', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // Start intercepting notifications
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // Archive conversation for user B
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversationList().clickConversationOptions(userA.fullName);
      await userBPages.conversationList().archiveConversation();

      // Send message from A to B in 1on1 conversation
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Hello');

      // Open the archived conversation and ensure the message was received
      await userBComponents.conversationSidebar().clickArchive();
      await userBPages.conversationList().openConversation(userA.fullName);
      await expect(userBPages.conversation().getMessage({sender: userA})).toBeVisible();

      // Check that B did not receive any more notifications
      await expect.poll(() => getUserBNotifications()).toHaveLength(0);
    },
  );

  test(
    'I want to mute 1on1 conversations via recent view',
    {tag: ['@TC-1437', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB))).webapp.pages;

      await pages.conversationList().clickConversationOptions(userB.fullName);
      await pages.conversationList().setNotifications('Nothing');

      const conversation = pages.conversationList().getConversationLocator(userB.fullName);
      await expect(conversation.getByTitle('Muted conversation')).toBeVisible();
    },
  );

  test(
    'I want to unmute 1on1 conversations via recent view',
    {tag: ['@TC-1438', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB))).webapp.pages;

      await pages.conversationList().clickConversationOptions(userB.fullName);
      await pages.conversationList().setNotifications('Nothing');

      const conversation = pages.conversationList().getConversationLocator(userB.fullName);
      await expect(conversation.getByTitle('Muted conversation')).toBeVisible();

      await pages.conversationList().clickConversationOptions(userB.fullName);
      await pages.conversationList().setNotifications('Everything');

      await expect(conversation.getByTitle('Muted conversation')).not.toBeVisible();
    },
  );

  [
    {testId: '@TC-1439', conversationType: 'group'} as const,
    {testId: '@TC-1440', conversationType: '1on1'} as const,
  ].forEach(({testId, conversationType}) => {
    test(
      `I want to mute the ${conversationType} conversation via conversation details`,
      {tag: [testId, '@regression']},
      async ({createPage}) => {
        const pages = PageManager.from(await createPage(withLogin(userA), withConnectedUser(userB))).webapp.pages;

        let conversationName: string;
        if (conversationType === 'group') {
          await createGroup(pages, 'Test Group', [userB]);
          conversationName = 'Test Group';
        } else {
          conversationName = userB.fullName;
        }

        await pages.conversationList().openConversation(conversationName);
        await pages.conversation().clickConversationInfoButton();
        await expect(pages.conversationDetails().notificationsButton).toContainText('Everything');

        await pages.conversationDetails().setNotifications('Nothing');
        await expect(pages.conversationDetails().notificationsButton).toContainText('Nothing');

        const conversation = pages.conversationList().getConversationLocator(conversationName);
        await expect(conversation.getByTitle('Muted conversation')).toBeVisible();

        // ToDo: Ensure you don't receive notifications
      },
    );
  });

  test(
    'I want to see join button on muted conversation when someone is trying to call me',
    {tag: ['@TC-1443', '@regression']},
    async ({createPage}) => {
      const [userAPages, userBPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectedUser(userB))).then(pm => pm.webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(pm => pm.webapp.pages),
      ]);

      // User B mutes the conversation with User A
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await userBPages.conversationList().clickConversationOptions(userA.fullName);
      await userBPages.conversationList().setNotifications('Nothing');

      // User A initiates a call to User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().clickCallButton();

      // Verify that User B sees a "Join" button on the muted conversation
      await expect(userBPages.conversationList().joinCallButton).toBeVisible();
    },
  );

  test(
    'I should not receive notifications for muted 1:1 conversations',
    {tag: ['@TC-1444', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      // Open 1on1 conversation between users
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      // User B mutes the conversation with User A via recent view
      await userBPages.conversationList().clickConversationOptions(userA.fullName);
      await userBPages.conversationList().setNotifications('Nothing');

      // Create group and open it for user B so the message won't be read immediately
      await createGroup(userAPages, 'Test Group', [userB]);
      await userBPages.conversationList().openConversation('Test Group');

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // User A sends message to User B and B received it
      await userAPages.conversationList().openConversation(userB.fullName);
      await userAPages.conversation().sendMessage('Test Message');
      await expect(userBPages.conversationList().getConversationLocator(userA.fullName)).toContainText('1 message');

      // Verify User B did not receive any notifications for the second message
      await expect.poll(() => getUserBNotifications()).toHaveLength(0);
    },
  );

  test(
    "Verify notification for ephemeral messages does not contain the message, sender's name or image",
    {tag: ['@TC-1448', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      // Create group and open it for user B so the message won't be read immediately
      await createGroup(userBPages, 'Test Group', [userA]);
      await userBPages.conversationList().openConversation('Test Group');

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // User A sends an ephemeral message
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().enableSelfDeletingMessages();
      await userAPages.conversation().sendMessage('Ephemeral Message');

      // Verify User B receives a notification, but it does not contain the message or sender's name
      await expect
        .poll(() => getUserBNotifications())
        .toEqual([expect.objectContaining({title: 'Someone', body: 'Sent a message'})]);
    },
  );

  // ToDo: Create parameterized test out of the following 4
  test(
    "Sender name and a message are shown in notification when 'Show sender and message' item is selected in preferences",
    {tag: ['@TC-1450', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const {pages: userAPages} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // User B navigates to preferences and sets "Show sender and message"
      await userBComponents.conversationSidebar().clickPreferencesButton();
      await userBPages.settings().optionsButton.click();
      await userBPages.options().setNotifications('Show sender and message');

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // ToDo: Also send types ping, link, audio, video and file transfer to 1on1 and group -> Same for 3 following tests
      // User A sends a message to User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      // Verify User B receives a notification containing sender's name and message content
      await expect
        .poll(() => getUserBNotifications())
        .toEqual([expect.objectContaining({title: userA.fullName, body: 'Test Message'})]);
    },
  );

  test(
    "No message content is written on notification when 'Show sender' item is selected in preferences",
    {tag: ['@TC-1451', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const {pages: userAPages} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // User B navigates to preferences and sets "Show sender"
      await userBComponents.conversationSidebar().clickPreferencesButton();
      await userBPages.settings().optionsButton.click();
      await userBPages.options().setNotifications('Show sender');

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // User A sends a message to User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      // Verify User B receives a notification containing sender's name and message content
      await expect
        .poll(() => getUserBNotifications())
        .toEqual([expect.objectContaining({title: userA.fullName, body: 'Sent a message'})]);
    },
  );

  test(
    "No sender name, profile image or message content is written on notification when choose 'Hide details' in preferences",
    {tag: ['@TC-1452', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const {pages: userAPages, components: userAComponents} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // User A uploads a profile picture which should not be shown in the notification
      await userAComponents.conversationSidebar().preferencesButton.click();
      await userAPages.settings().accountButton.click();
      await userAPages.account().uploadProfilePicture(getImageFilePath());
      await userAComponents.conversationSidebar().allConverationsButton.click();

      // User B navigates to preferences and sets "Show sender"
      await userBComponents.conversationSidebar().preferencesButton.click();
      await userBPages.settings().optionsButton.click();
      await userBPages.options().setNotifications('Hide details');

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // User A sends a message to User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      // Verify User B receives a notification containing sender's name and message content
      await expect
        .poll(() => getUserBNotifications())
        .toEqual([
          expect.objectContaining({
            title: 'Someone',
            body: 'Sent a message',
            // Verify the icon of the notification is the default one and not the users profile picture
            icon: expect.stringMatching(/notification\.png$/),
          }),
        ]);
    },
  );

  test(
    "No notification shown when selecting 'Off' in preferences",
    {tag: ['@TC-1453', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const {pages: userAPages} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, components: userBComponents} = PageManager.from(userBPage).webapp;

      // User B navigates to preferences and sets "Off"
      await userBComponents.conversationSidebar().clickPreferencesButton();
      await userBPages.settings().optionsButton.click();
      await userBPages.options().setNotifications('Off');

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // User A sends a message to User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      await userBComponents.conversationSidebar().allConverationsButton.click();
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
      await expect(userBPages.conversation().getMessage({sender: userA})).toBeVisible();

      // Verify User B receives a notification containing sender's name and message content
      await expect.poll(() => getUserBNotifications()).toHaveLength(0);
    },
  );

  test(
    'Verify I can click ping notification while other conversation is opened',
    {tag: ['@TC-1455', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await createGroup(userBPages, 'Test Group', [userA]);
      await userBPages.conversationList().openConversation('Test Group');

      // Start intercepting notifications
      const {clickNotification} = await interceptNotifications(userBPage);

      // User A pings User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendPing();

      await clickNotification({title: userA.fullName, body: 'Pinged'});

      // After clicking the notification B should show the 1on1 conversation instead of the group
      await expect(userBPages.conversation().conversationTitle).toContainText(userA.fullName);
    },
  );

  test(
    'Verify I can click calling notification while other conversation is opened',
    {tag: ['@TC-1456', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await createGroup(userBPages, 'Test Group', [userA]);
      await userBPages.conversationList().openConversation('Test Group');

      const {clickNotification} = await interceptNotifications(userBPage);

      // User A initiates a call to User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().clickCallButton();

      // Verify user B receives the call
      await expect(userBPages.calling().acceptCallButton).toBeVisible();

      // User B clicks the calling notification
      await clickNotification({title: userA.fullName, body: 'Calling'});

      // Verify clicking the notification opens the calls conversation
      await expect(userBPages.conversation().conversationTitle).toContainText(userA.fullName);
    },
  );

  // ToDo: Wait for confirmation if this test is implemented correctly (title might change)
  test(
    'Verify clicking a notification of a team opens team conversation',
    {tag: ['@TC-1458', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await createGroup(userBPages, 'Test Group', [userA]);
      await userBPages.conversationList().openConversation('Test Group');

      // Start intercepting notifications
      const {clickNotification} = await interceptNotifications(userBPage);

      // User A pings User B
      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userAPages.conversation().sendMessage('Test Message');

      await clickNotification({title: userA.fullName, body: 'Test Message'});

      // After clicking the notification B should show the 1on1 conversation instead of the group
      await expect(userBPages.conversation().conversationTitle).toContainText(userA.fullName);
    },
  );

  test(
    'Verify I see notification when someone creates a group',
    {tag: ['@TC-1459', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      const {getNotifications} = await interceptNotifications(userBPage);

      const groupName = 'Test Group';
      await createGroup(userAPages, groupName, [userB]);

      // Verify User B receives a notification about the new group
      await expect
        .poll(() => getNotifications())
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: `${userA.fullName} in ${groupName}`,
              body: expect.stringContaining(`${userA.fullName} started a conversation`),
            }),
          ]),
        );
    },
  );

  test(
    'Verify I see notification when group name is changed',
    {tag: ['@TC-1461', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      // User A creates a group with User B
      const originalGroupName = 'Original Group Name';
      const newGroupName = 'New Group Name';
      await createGroup(userAPages, originalGroupName, [userB]);

      // Start intercepting notifications for User B
      const {getNotifications: getUserBNotifications} = await interceptNotifications(userBPage);

      // User A opens ConversationDetailsPage and changes the group name
      await userAPages.conversationList().openConversation(originalGroupName);
      await userAPages.conversation().clickConversationInfoButton();
      await userAPages.conversationDetails().changeConversationName(newGroupName);

      // Verify User B receives a notification about the group name change
      await expect
        .poll(() => getUserBNotifications())
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: `${userA.fullName} in ${newGroupName}`, // Assuming the new group name is in the title
              body: `${userA.fullName} renamed the conversation to ${newGroupName}`,
            }),
          ]),
        );
    },
  );

  test(
    'Verify I see notification when I receive a connection request',
    {tag: ['@TC-1462', '@regression']},
    async ({createPage, createUser}) => {
      // Create User C as member outside the team
      const userC = await createUser();

      // Users A and B are created, but not connected for this test
      const [userAPage, userCPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userC))]);

      // Start intercepting notifications for User B
      const {getNotifications} = await interceptNotifications(userCPage);

      // User A sends a connection request to User B
      await sendConnectionRequest(PageManager.from(userAPage), userC);

      // Verify User B receives a notification about the connection request
      await expect
        .poll(() => getNotifications())
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: userA.fullName,
              body: 'Wants to connect',
            }),
          ]),
        );
    },
  );

  test(
    'Verify I see notification when image is sent to group conversation',
    {tag: ['@TC-1464', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      const groupName = 'Image Group';
      await createGroup(userAPages, groupName, [userB]);
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      // Start intercepting notifications for User B
      const {getNotifications} = await interceptNotifications(userBPage);

      // User A sends an image to the group conversation
      await userAPages.conversationList().openConversation(groupName);
      await shareAssetHelper(getImageFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add picture'}));

      await expect
        .poll(() => getNotifications())
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: `${userA.fullName} in ${groupName}`,
              body: 'Shared a picture',
            }),
          ]),
        );
    },
  );

  test(
    'Verify I see notification when someone changes the timer',
    {tag: ['@TC-1466', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await createGroup(userAPages, 'Test Group', [userB]);
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      const {getNotifications} = await interceptNotifications(userBPage);

      // User A changes the conversation timer to 10 seconds
      await userAPages.conversationList().openConversation('Test Group');
      await userAPages.conversation().toggleGroupInformation();
      await userAPages.conversationDetails().setSelfDeletingMessages('10 seconds');

      // Verify User B receives a notification about the timer change
      await expect
        .poll(() => getNotifications())
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: `${userA.fullName} in Test Group`,
              body: `${userA.fullName} set the message timer to 10 seconds`,
            }),
          ]),
        );
    },
  );
});
