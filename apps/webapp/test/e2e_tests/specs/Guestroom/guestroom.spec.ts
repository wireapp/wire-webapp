import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withConnectedUser, withLogin, Team, LOGIN_TIMEOUT} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Guestroom', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  const groupName = 'Guestroom';

  test.beforeEach(async ({createTeam, createUser}) => {
    userB = await createUser();
    userC = await createUser();
    team = await createTeam('Test Team', {users: [userC]});
    userA = team.owner;
  });

  test(
    'I want to join a conversation through password secured invite link as existing user',
    {tag: ['@TC-8140', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userC)),
        createPage(),
      ]);

      const password = 'Test1234?';
      let createdLink: string;

      const userAPageManager = PageManager.from(userAPage).webapp;
      const userBPageManager = PageManager.from(userBPage);
      const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;
      const {pages} = userAPageManager;

      await test.step('User A creates invite link with password for conversation', async () => {
        await createGroup(pages, groupName, [userC]);
        await pages.conversationList().openConversation(groupName);
        await pages.conversation().toggleGroupInformation();
        await pages.conversationDetails().guestOptionsButton.click();
        createdLink = await pages.guestOptions().createLink({password});
      });

      await test.step('User B sees error when entering incorrect password', async () => {
        await userBPage.goto(createdLink.toString());
        await userBPages.joinConversation().joinBrowserButton.click();
        await expect(userBPages.joinConversation().joinAsGuest).toBeVisible();

        await userBPages.login().login(userB);
        await userBModals.conversationAccess().joinConversation('WrongPassword');
        await expect(userBModals.conversationAccess().joinForm).toContainText(
          'Password is incorrect, please try again.',
        );
      });

      await test.step('User B can join conversation with correct password', async () => {
        await userBModals.conversationAccess().joinConversation(password);
        await userBPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
        await expect(userBPages.conversation().conversationTitle).toContainText(groupName);
      });
    },
  );

  test(
    'I want to get logged out with a reason when my account expires',
    {tag: ['@TC-3365', '@regression']},
    async ({createPage}) => {
      test.setTimeout(150_000);
      let createdLink: string;
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userC)),
        createPage(),
      ]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const userBPageManager = PageManager.from(userBPage);
      const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;
      const {pages} = userAPageManager;

      await test.step('User A creates invite link', async () => {
        await createGroup(pages, groupName, [userC]);
        await pages.conversationList().openConversation(groupName);
        await pages.conversation().toggleGroupInformation();
        await pages.conversationDetails().guestOptionsButton.click();
        createdLink = await pages.guestOptions().createLink();
      });

      await test.step('User B joins the group using the invitation link', async () => {
        await userBPage.goto(createdLink.toString());
        await userBPages.joinConversation().joinBrowserButton.click();
        await expect(userBPages.joinConversation().joinAsGuest).toBeVisible();

        // Add expires_in query parameter to simulate account expiration
        const joinLink = new URL(userBPage.url());
        joinLink.searchParams.set('expires_in', '60');

        await userBPage.goto(joinLink.toString());
        await userBPages.joinConversation().nameInput.fill(userB.firstName);
        await userBPages.joinConversation().acceptTermsCheckBox.check({force: true});
        await userBPages.joinConversation().joinAsGuest.click();
      });

      await test.step('User B sends a message in the conversation', async () => {
        await userBPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
        await userBModals.confirm().actionButton.click();
        await userBPages.conversation().sendMessage('Hello from Guest');
      });

      await test.step('User A sees guest details (to trigger access validation) after 1 minute', async () => {
        await pages.conversation().toggleGroupInformation();
        await userAPage.waitForTimeout(60_000);
        await pages.conversationDetails().openParticipantDetails(userB.firstName);
        await expect(pages.participantDetails().userStatus).toBeVisible();
      });

      await test.step('User B confirms that he was logged out due to expiration', async () => {
        await expect(userBPage.getByTestId('status-logout-reason')).toContainText(
          'You were signed out because your account was deleted.',
        );
      });
    },
  );
});
