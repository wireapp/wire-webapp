import {Page} from 'playwright/test';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {mockNotifications} from 'test/e2e_tests/scripts/mock-notifications';
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

    // Create group so B can open it while A sends the message
    await createGroup(userAPages, 'Test Group', [userB]);

    // Start intercepting notifications
    await userBPage.evaluate(mockNotifications);

    // Open group for user B to the message won't be read immediately
    await userBPages.conversationList().openConversation('Test Group');

    // Send message from A to B in 1on1 conversation
    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hello');

    // Check the notifications B received to contain the message from A
    await expect
      .poll(() => getNotifications(userBPage))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: userA.fullName,
            body: `Mention: @${userB.fullName} Hello`,
          }),
        ]),
      );
  });
});

const getNotifications = async (page: Page) => {
  return await page.evaluate(() =>
    window.__wireNotifications.map(n => ({
      title: n.title,
      body: n.body,
      data: n.data,
    })),
  );
};
