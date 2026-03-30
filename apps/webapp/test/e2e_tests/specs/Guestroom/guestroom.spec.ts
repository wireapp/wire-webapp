import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {
  test,
  expect,
  withConnectedUser,
  withLogin,
  Team,
  LOGIN_TIMEOUT,
  withConnectionRequest,
} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Guestroom', () => {
  let team: Team;
  let userA: User;
  let userB: User;
  let userC: User;
  let createdLink: string;
  const groupName = 'Guestroom';
  const password = 'Test1234?';

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

      const userAPageManager = PageManager.from(userAPage).webapp;
      const userBPageManager = PageManager.from(userBPage);
      const {pages: userBPages, modals: userBModals} = userBPageManager.webapp;
      const {pages} = userAPageManager;

      await test.step('User A creates invite link with password for conversation', async () => {
        await createGroup(pages, groupName, [userC]);
        await pages.conversationList().openConversation(groupName);
        await pages.conversation().toggleGroupInformation();
        await pages.conversationDetails().openQuestOptions();
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

  test('I want to create a password secured guest link', {tag: ['@TC-8141', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA), withConnectedUser(userC));
    const {pages, modals} = PageManager.from(userAPage).webapp;

    await createGroup(pages, groupName, [userC]);
    await pages.conversationList().openConversation(groupName);

    // UserA sees an error message when trying to create a password secured link with a weak password
    await pages.conversation().toggleGroupInformation();
    await pages.conversationDetails().openQuestOptions();
    await pages.guestOptions().createLinkButton.click();

    await modals.guestLinkPassword().setPasswordInput.fill('wrongPassword');
    await modals.guestLinkPassword().confirmPasswordInput.fill('wrongPassword');
    await modals.guestLinkPassword().actionButton.click();
    await expect(modals.guestLinkPassword().errorMessage).toContainText(
      'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
    );

    // UserA cancels the creation of the password secured link
    await modals.guestLinkPassword().setPasswordInput.fill(password);
    await modals.guestLinkPassword().confirmPasswordInput.fill(password);
    await modals.guestLinkPassword().actionButton.click();
    await modals.confirm().cancelButton.click();
    await expect(pages.guestOptions().guestLink).not.toBeVisible();

    // UserA creates a password secured link with a valid password
    await pages.guestOptions().createLink({password});
    await expect(pages.guestOptions().guestLink).toBeVisible();
    await expect(userAPage.getByText('Link is password secured')).toBeVisible();
  });

  test('I want to revoke a password secured guest link', {tag: ['@TC-8142', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA), withConnectedUser(userC));
    const {pages} = PageManager.from(userAPage).webapp;

    await createGroup(pages, groupName, [userC]);
    await pages.conversationList().openConversation(groupName);

    await pages.conversation().toggleGroupInformation();
    await pages.conversationDetails().openQuestOptions();
    await pages.guestOptions().createLink({password});

    await expect(pages.guestOptions().guestLink).toBeVisible();
    await expect(userAPage.getByText('Link is password secured')).toBeVisible();

    await pages.guestOptions().revokeLink();
    await expect(pages.guestOptions().guestLink).not.toBeVisible();
  });

  [
    {
      description: 'I want to see guest indicator on participant details',
      tag: '@TC-3307',
      verify: async (pages: PageManager['webapp']['pages']) => {
        await expect(pages.participantDetails().userStatus).toContainText('Guest');
      },
    },
    {
      description: 'I should not see a username for wireless guest on participant details',
      tag: '@TC-3311',
      verify: async (pages: PageManager['webapp']['pages']) => {
        await expect(pages.participantDetails().userHandle).not.toBeVisible();
      },
    },
    {
      description: 'I should not be able to connect to a wireless guest on participant details',
      tag: '@TC-3312',
      verify: async (pages: PageManager['webapp']['pages']) => {
        await expect(pages.participantDetails().connectButton).not.toBeVisible();
      },
    },
    {
      description: 'I should not see button to open 1:1 with wireless guest on participant details',
      tag: '@TC-3313',
      verify: async (pages: PageManager['webapp']['pages']) => {
        await expect(pages.participantDetails().openConversationButton).not.toBeVisible();
      },
    },
  ].forEach(({description, tag, verify}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPage, questPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userC)),
        createPage(),
      ]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const questPageManager = PageManager.from(questPage);
      const {pages: questPages, modals: guestModals} = questPageManager.webapp;
      const {pages} = userAPageManager;

      await createGroup(pages, groupName, [userC]);

      await pages.conversationList().openConversation(groupName);
      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().openQuestOptions();
      createdLink = await pages.guestOptions().createLink();

      await questPage.goto(createdLink.toString());
      await questPages.joinConversation().joinBrowserButton.click();
      await expect(questPages.joinConversation().joinAsGuest).toBeVisible();

      await questPages.joinConversation().nameInput.fill(userB.firstName);
      await questPages.joinConversation().acceptTermsCheckBox.check({force: true});
      await questPages.joinConversation().joinAsGuest.click();

      await questPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
      await guestModals.confirm().actionButton.click();
      await expect(questPages.conversation().conversationTitle).toContainText(groupName);

      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().openParticipantDetails(userB.firstName);
      await verify(pages);
    });
  });

  test(
    'I should not see guests when adding people to existing conversation when guest toggle is OFF',
    {tag: ['@TC-3318', '@regression']},
    async ({createPage}) => {
      const [ownerPages, guestPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(userB))).then(({webapp}) => webapp.pages),
        PageManager.from(createPage(withLogin(userB))).then(({webapp}) => webapp.pages),
      ]);

      await guestPages.conversationList().openPendingConnectionRequest();
      await guestPages.connectRequest().clickConnectButton();

      await createGroup(ownerPages, groupName, [userB, userC]);
      await ownerPages.conversationList().openConversation(groupName);
      await ownerPages.conversation().toggleGroupInformation();
      await expect(ownerPages.conversationDetails().groupMembers.filter({hasText: userB.fullName})).toBeVisible();

      await ownerPages.conversationDetails().openQuestOptions();
      await ownerPages.guestOptions().toggleQuests();
      await ownerPages.conversation().toggleGroupInformation();
      await expect(ownerPages.conversationDetails().groupMembers.filter({hasText: userB.fullName})).not.toBeVisible();

      await ownerPages.conversationDetails().clickAddPeopleButton();
      await ownerPages.conversationDetails().searchPeopleInput.fill(userB.fullName);
      await expect(ownerPages.conversationDetails().searchList).toContainText(
        'No matching results. Try entering a different name.',
      );
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
