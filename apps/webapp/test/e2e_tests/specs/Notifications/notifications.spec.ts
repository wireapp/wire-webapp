import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {interceptNotifications} from 'test/e2e_tests/utils/mockNotifications.util';
import {test, withLogin, withConnectedUser, expect} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

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

  // TODO: This test is currently failing if it's a bug disable it and link bug ticket
  test(
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
});
