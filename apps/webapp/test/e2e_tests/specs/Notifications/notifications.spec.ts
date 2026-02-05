import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
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
      createPage(withLogin(userA)),
      createPage(withLogin(userB), withConnectedUser(userA)),
    ]);
    const userAPages = PageManager.from(userAPage).webapp.pages;
    const userBPages = PageManager.from(userBPage).webapp.pages;

    await userBPage.evaluate(() => {
      // @ts-expect-error --- This function is private within the class
      window.wire.app.repository.notification.shouldShowNotification = () => true;
      window.wire.app.repository.notification.checkPermission = () => Promise.resolve(true);
    });

    await createGroup(userAPages, 'Test Group', [userB]);

    await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
    await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});
    await userAPages.conversation().sendMessageWithUserMention(userB.fullName, 'Hello');

    await expect(async () => {
      const notifications = await userBPage.evaluate(() => window.wire.app.repository.notification.notifications);
      expect(notifications).toHaveLength(1);
    }).toPass({timeout: 5000});
  });
});
