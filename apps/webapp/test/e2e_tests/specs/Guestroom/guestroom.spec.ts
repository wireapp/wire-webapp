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

const generateGroupGuestLink = async (pages: PageManager['webapp']['pages'], groupName: string, password?: string) => {
  await pages.conversationList().openConversation(groupName);
  await pages.conversation().toggleGroupInformation();
  await pages.conversationDetails().openGuestOptions();

  return await pages.guestOptions().createLink({password});
};

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
      const [userAPage, guestPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userC)),
        createPage(),
      ]);

      const {pages: guestPages, modals: guestBModals} = PageManager.from(guestPage).webapp;
      const {pages} = PageManager.from(userAPage).webapp;

      await test.step('User A creates invite link with password for conversation', async () => {
        await createGroup(pages, groupName, [userC]);
        createdLink = await generateGroupGuestLink(pages, groupName, password);
      });

      await test.step('User B sees error when entering incorrect password', async () => {
        await guestPage.goto(createdLink.toString());
        await guestPages.conversationJoin().joinBrowserButton.click();
        await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

        await guestPages.login().login(userB);
        await guestBModals.conversationAccess().joinConversation('WrongPassword');
        await expect(guestBModals.conversationAccess().joinForm).toContainText(
          'Password is incorrect, please try again.',
        );
      });

      await test.step('User B can join conversation with correct password', async () => {
        await guestBModals.conversationAccess().joinConversation(password);
        await guestPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
        await expect(guestPages.conversation().conversationTitle).toContainText(groupName);
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
    await pages.conversationDetails().openGuestOptions();
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
    await generateGroupGuestLink(pages, groupName, password);

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
      const [userAPage, guestPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userC)),
        createPage(),
      ]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const guestPageManager = PageManager.from(guestPage);
      const {pages: guestPages, modals: guestModals} = guestPageManager.webapp;
      const {pages} = userAPageManager;

      await createGroup(pages, groupName, [userC]);
      createdLink = await generateGroupGuestLink(pages, groupName);

      await guestPage.goto(createdLink.toString());
      await guestPages.conversationJoin().joinBrowserButton.click();
      await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

      await guestPages.conversationJoin().joinAsGuest(userB.firstName);

      await guestPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
      await guestModals.confirm().actionButton.click();
      await expect(guestPages.conversation().conversationTitle).toContainText(groupName);

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

      await ownerPages.conversationDetails().openGuestOptions();
      await ownerPages.guestOptions().toggleGuests();
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
    'I want to see Wire and Wireless guest(s) are removed when I change the Allow guests from on to off',
    {tag: ['@TC-3322', '@regression']},
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

      await ownerPages.conversationDetails().openGuestOptions();
      await ownerPages.guestOptions().toggleGuests();

      await expect(
        ownerPages.conversation().systemMessages.filter({hasText: `You removed ${userB.fullName}`}),
      ).toBeVisible();
    },
  );

  test(
    'I want to see a description of what does Allow guests mean',
    {tag: ['@TC-3323', '@regression']},
    async ({createPage}) => {
      const ownerPage = await createPage(withLogin(userA));
      const ownerPages = PageManager.from(ownerPage).webapp.pages;

      await createGroup(ownerPages, groupName, [userC]);
      await ownerPages.conversationList().openConversation(groupName);
      await ownerPages.conversation().toggleGroupInformation();

      await ownerPages.conversationDetails().openGuestOptions();
      await ownerPages.guestOptions().guestsToggle.click();

      await expect(ownerPage.getByTestId('status-guest-options-info')).toContainText(
        'Open this conversation to people outside your team.',
      );
    },
  );

  [
    {
      description: 'I want to see the Allow Guests toggle in Linear Group Creation flow',
      tag: '@TC-3326',
    },
    {
      description: 'I want to see guest toggle being ON by default in linear group creation',
      tag: '@TC-3327',
    },
  ].forEach(({description, tag}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const ownerPage = await createPage(withLogin(userA));
      const ownerPages = PageManager.from(ownerPage).webapp.pages;

      // UserA sees allow guests toggle is ON on group creation page
      await ownerPages.conversationList().clickCreateGroup();
      await expect(ownerPages.groupCreation().guestsToggle).toHaveAttribute('data-uie-value', 'checked');

      await ownerPages.groupCreation().setGroupName(groupName);
      await ownerPages.groupCreation().selectGroupMembers(userC.username);
      await ownerPages.groupCreation().clickCreateGroupButton();

      await ownerPages.conversationList().openConversation(groupName);
      await ownerPages.conversation().toggleGroupInformation();

      // UserA sees guest options label shows ON in conversation details
      await expect(ownerPages.conversationDetails().guestOptionsButton).toContainText('On');
      // UserA confirms allow guests toggle is ON in guest options
      await ownerPages.conversationDetails().openGuestOptions();
      await expect(ownerPages.guestOptions().guestsToggle).toHaveAttribute('data-uie-value', 'checked');
    });
  });

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
        createdLink = await generateGroupGuestLink(pages, groupName);
      });

      await test.step('User B joins the group using the invitation link', async () => {
        await userBPage.goto(createdLink.toString());
        await userBPages.conversationJoin().joinBrowserButton.click();
        await expect(userBPages.conversationJoin().joinAsGuestButton).toBeVisible();

        // Add expires_in query parameter to simulate account expiration
        const joinLink = new URL(userBPage.url());
        joinLink.searchParams.set('expires_in', '60');

        await userBPage.goto(joinLink.toString());
        await userBPages.conversationJoin().joinAsGuest(userB.firstName);
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
