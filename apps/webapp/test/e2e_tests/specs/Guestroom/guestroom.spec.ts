import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin, Team} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Conversations', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Test Group';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();
    team = await createTeam('Test Team', {users: [userB, userC]});
    userA = team.owner;
  });

  test(
    'I want to get logged out with a reason when my account expires',
    {tag: ['@TC-3365', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userC)),
        createPage(),
      ]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const userBPageManager = PageManager.from(userBPage);
      const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;
      const {pages} = userAPageManager;

      await createGroup(pages, groupName, [userC]);
      await pages.conversationList().openConversation(groupName);
      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().guestOptionsButton.click();

      const createdLink = await pages.guestOptions().createLink();

      const linkWithExpires = new URL(createdLink);
      linkWithExpires.searchParams.set('expires_in', '60');

      await userBPageManager.openUrl(linkWithExpires.toString());
      await userBPages.joinConversation().joinBrowserButton.click();
      await expect(userBPages.joinConversation().joinAsGuest).toBeVisible();

      const joinLink = new URL(userBPage.url());
      joinLink.searchParams.set('expires_in', '60');
      joinLink.hostname = 'wire-webapp-dev.zinfra.io';

      await userBPageManager.openUrl(joinLink.toString());
      await userBPages.joinConversation().nameInput.fill(userB.firstName);
      await userBPages.joinConversation().acceptCheckBox.check({force: true});
      await userBPages.joinConversation().joinAsGuest.click();

      await userBPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: 40_000});
      await userBModals.confirm().actionButton.click();
      await userBPageManager.waitForTimeout(1000);
      await userBPages.conversation().conversationTitle.waitFor({state: 'hidden', timeout: 90_000});
    },
  );
});
