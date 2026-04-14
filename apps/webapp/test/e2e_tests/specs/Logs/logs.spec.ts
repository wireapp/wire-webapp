import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withLogin, withConnectedUser} from 'test/e2e_tests/test.fixtures';

test.describe('Logs', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test(
    'Check that user messages are not being console logged',
    {tag: ['@TC-8794', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);

      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      const messageA = 'Hello from UserA! This is a secret message.';
      const messageB = 'Hi from UserB! No logging allowed.';

      await userAPages.conversationList().getConversationLocator(userB.fullName, {protocol: 'mls'}).open();
      await userBPages.conversationList().getConversationLocator(userA.fullName, {protocol: 'mls'}).open();
      await userAPages.conversation().sendMessage(messageA);
      await userBPages.conversation().sendMessage(messageB);

      // Wait for messages to appear to ensure all related console output has happened
      await expect(userBPages.conversation().getMessage({content: messageA})).toBeVisible();
      await expect(userAPages.conversation().getMessage({content: messageB})).toBeVisible();

      // Assert that message content is not present in console logs
      const userALogs = await userAPage.consoleMessages();
      const hasMessageInLogs = userALogs
        .map(log => log.text())
        .some(log => log.includes(messageA) || log.includes(messageB));
      expect(hasMessageInLogs).toBe(false);
    },
  );
});
