import {Page} from 'playwright/test';
import {getUser, User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {
  test,
  expect,
  withLogin,
  Team,
  LOGIN_TIMEOUT,
  withGuestUser,
  withConnectionRequest,
} from 'test/e2e_tests/test.fixtures';
import {createGroup} from 'test/e2e_tests/utils/userActions';

/**
 * Navigates through the UI to generate a guest invitation link for a specific group.
 * @param pages - The PageManager instance providing access to webapp page objects.
 * @param groupName - The exact display name of the group to open.
 * @param password - (Optional) If provided, the generated link will be password-protected.
 * Omit this if you want to generate an unprotected link.
 * * @returns A promise that resolves to the generated guest link string.
 */

const generateGroupGuestsLink = async (pages: PageManager['webapp']['pages'], groupName: string, password?: string) => {
  await pages.conversationList().openConversation(groupName);
  await pages.conversation().toggleGroupInformation();
  await pages.conversationDetails().openGuestOptions();

  return await pages.guestOptions().createLink({password});
};

test.describe('Guestroom', () => {
  let team: Team;
  let userA: User;
  let guestUser: User;
  const groupName = 'Guestroom';
  const password = 'Test1234?';

  test.beforeEach(async ({createTeam, createUser}) => {
    guestUser = await createUser();
    team = await createTeam('Test Team');
    userA = team.owner;
  });

  test(
    'I want to join a conversation through password secured invite link as existing user',
    {tag: ['@TC-8140', '@regression']},
    async ({createPage}) => {
      const [userAPage, guestPage] = await Promise.all([createPage(withLogin(userA)), createPage()]);
      let createdLink: string;

      const {pages: guestPages, modals: guestBModals} = PageManager.from(guestPage).webapp;
      const {pages} = PageManager.from(userAPage).webapp;

      await test.step('User A creates invite link with password for conversation', async () => {
        await createGroup(pages, groupName, []);
        createdLink = await generateGroupGuestsLink(pages, groupName, password);
      });

      await test.step('User B sees error when entering incorrect password', async () => {
        await guestPage.goto(createdLink.toString());
        await expect(guestPages.conversationJoin().joinBrowserButton).toBeVisible();
        await guestPages.conversationJoin().joinBrowserButton.click();
        await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

        await guestPages.login().login(guestUser);
        await expect(guestBModals.joinGuestLinkPassword().joinForm).toBeVisible({timeout: LOGIN_TIMEOUT});
        await guestBModals.joinGuestLinkPassword().joinConversation('WrongPassword');
        await expect(guestBModals.joinGuestLinkPassword().joinForm).toContainText(
          'Password is incorrect, please try again.',
        );
      });

      await test.step('User B can join conversation with correct password', async () => {
        await guestBModals.joinGuestLinkPassword().joinConversation(password);
        await expect(guestPages.conversation().conversationTitle).toContainText(groupName, {timeout: LOGIN_TIMEOUT});
      });
    },
  );

  test('I want to create a password secured guest link', {tag: ['@TC-8141', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA));
    const {pages, modals} = PageManager.from(userAPage).webapp;

    await createGroup(pages, groupName, []);
    await pages.conversationList().openConversation(groupName);

    await test.step('User A sees an error message when trying to create a password secured link with a weak password', async () => {
      await pages.conversation().toggleGroupInformation();
      await pages.conversationDetails().openGuestOptions();
      await pages.guestOptions().createLinkButton.click();

      await modals.guestLinkPassword().setPasswordInput.fill('wrongPassword');
      await modals.guestLinkPassword().confirmPasswordInput.fill('wrongPassword');
      await modals.guestLinkPassword().actionButton.click();
      await expect(modals.guestLinkPassword().errorMessage).toContainText(
        'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
      );
    });

    await test.step('UserA cancels the creation of the password secured link', async () => {
      await modals.guestLinkPassword().setPasswordInput.fill(password);
      await modals.guestLinkPassword().confirmPasswordInput.fill(password);
      await modals.guestLinkPassword().actionButton.click();
      await modals.confirm().cancelButton.click();
      await expect(pages.guestOptions().guestLink).not.toBeVisible();
    });

    await test.step('UserA creates a password secured link with a valid password', async () => {
      await pages.guestOptions().createLink({password});
      await expect(pages.guestOptions().guestLink).toBeVisible();
      await expect(userAPage.getByText('Link is password secured')).toBeVisible();
    });
  });

  test('I want to revoke a password secured guest link', {tag: ['@TC-8142', '@regression']}, async ({createPage}) => {
    const userAPage = await createPage(withLogin(userA));
    const {pages} = PageManager.from(userAPage).webapp;

    await createGroup(pages, groupName, []);
    await generateGroupGuestsLink(pages, groupName, password);

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
      const {pages} = PageManager.from(await createPage(withLogin(userA))).webapp;

      await createGroup(pages, groupName, []);
      const createdLink = await generateGroupGuestsLink(pages, groupName);

      await createPage(withGuestUser(createdLink, guestUser.firstName));

      await pages.conversation().toggleGroupInformation();
      await expect(pages.conversationDetails().groupMembers.filter({hasText: guestUser.firstName})).toBeVisible();

      await pages.conversationDetails().openParticipantDetails(guestUser.firstName);
      await verify(pages);
    });
  });

  test(
    'I should not see guests when adding people to existing conversation when guest toggle is OFF',
    {tag: ['@TC-3318', '@regression']},
    async ({createPage}) => {
      const [ownerPages, guestPages] = await Promise.all([
        PageManager.from(createPage(withLogin(userA), withConnectionRequest(guestUser))).then(
          ({webapp}) => webapp.pages,
        ),
        PageManager.from(createPage(withLogin(guestUser))).then(({webapp}) => webapp.pages),
      ]);

      await guestPages.conversationList().openPendingConnectionRequest();
      await guestPages.connectRequest().clickConnectButton();

      await test.step('Owner creates a group with guest', async () => {
        await createGroup(ownerPages, groupName, [guestUser]);
        await ownerPages.conversationList().openConversation(groupName);
        await ownerPages.conversation().toggleGroupInformation();
        await expect(ownerPages.conversationDetails().groupMembers.filter({hasText: guestUser.fullName})).toBeVisible();
      });

      await test.step('Guest is removed when Allow guests is turned off', async () => {
        await ownerPages.conversationDetails().openGuestOptions();
        await ownerPages.guestOptions().toggleGuests();
        await ownerPages.conversation().toggleGroupInformation();
        await expect(
          ownerPages.conversationDetails().groupMembers.filter({hasText: guestUser.fullName}),
        ).not.toBeVisible();
      });

      await test.step('Owner should not see guest in search result, when adding people to conversation with Allow guests turned off', async () => {
        await ownerPages.conversationDetails().clickAddPeopleButton();
        await ownerPages.conversationDetails().searchPeopleInput.fill(guestUser.fullName);
        await expect(ownerPages.conversationDetails().searchList).toContainText(
          'No matching results. Try entering a different name.',
        );
      });
    },
  );

  test(
    'I want to see Wire and Wireless guest(s) are removed when I change the Allow guests from on to off',
    {tag: ['@TC-3322', '@regression']},
    async ({createPage}) => {
      const ownerPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await createGroup(ownerPages, groupName, []);
      await ownerPages.conversationList().openConversation(groupName);

      // Owner creates a guest link
      await ownerPages.conversation().toggleGroupInformation();
      const link = await ownerPages.conversationDetails().createGuestLink();
      await createPage(withGuestUser(link, guestUser.firstName));

      await expect(
        ownerPages.conversation().systemMessages.filter({hasText: `${guestUser.firstName} joined`}),
      ).toBeVisible();

      // Owner turns off Allow guests toggle
      await ownerPages.conversationDetails().openGuestOptions();
      await ownerPages.guestOptions().toggleGuests();

      await expect(
        ownerPages.conversation().systemMessages.filter({hasText: `You removed ${guestUser.firstName}`}),
      ).toBeVisible();
    },
  );

  test(
    'I want to see a description of what does Allow guests mean',
    {tag: ['@TC-3323', '@regression']},
    async ({createPage}) => {
      const ownerPage = await createPage(withLogin(userA));
      const ownerPages = PageManager.from(ownerPage).webapp.pages;

      await createGroup(ownerPages, groupName, []);
      await ownerPages.conversationList().openConversation(groupName);
      await ownerPages.conversation().toggleGroupInformation();

      await ownerPages.conversationDetails().openGuestOptions();
      // Turn off Guest options as it is on by default
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
      const ownerPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      // UserA sees allow guests toggle is ON on group creation page
      await ownerPages.conversationList().clickCreateGroup();
      await expect(ownerPages.groupCreation().guestsToggle).toHaveAttribute('data-uie-value', 'checked');

      await ownerPages.groupCreation().setGroupName(groupName);
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
    'I want to see a system message when wireless guest has joined or left',
    {tag: ['@TC-3334', '@regression']},
    async ({createPage}) => {
      const [userAPage, guestPage] = await Promise.all([createPage(withLogin(userA)), createPage()]);
      const ownerPages = PageManager.from(userAPage).webapp.pages;
      const {pages: guestPages, modals: guestModals} = PageManager.from(guestPage).webapp;

      await createGroup(ownerPages, groupName, []);
      const createdLink = await generateGroupGuestsLink(ownerPages, groupName);

      // Guest joins the conversation using the invitation link
      await guestPage.goto(createdLink.toString());
      await guestPages.conversationJoin().joinBrowserButton.click();
      await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

      await guestPages.login().login(guestUser);
      await guestPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});

      await expect(
        ownerPages.conversation().systemMessages.filter({hasText: `${guestUser.fullName} joined`}),
      ).toBeVisible();

      // Guest leaves the conversation
      await guestPages.conversation().toggleGroupInformation();
      await guestPages.conversation().leaveConversation();
      await guestModals.leaveConversation().clickConfirm();

      await expect(
        ownerPages.conversation().systemMessages.filter({hasText: `${guestUser.fullName} left`}),
      ).toBeVisible();
    },
  );

  [
    {
      description: 'I want to see Invite People button when Allow Guests is on',
      tag: '@TC-3335',
      verify: async (pages: PageManager['webapp']['pages']) => {
        await expect(pages.conversation().invitePeopleButton).toBeVisible();
      },
    },
    {
      description:
        'I want to see a hint text that people from outside can join if the conversation is opened for guests',
      tag: '@TC-3340',
      verify: async (pages: PageManager['webapp']['pages']) => {
        await expect(
          pages.conversation().systemMessages.filter({hasText: `People outside your team can join this conversation.`}),
        ).toBeVisible();
      },
    },
  ].forEach(({description, tag, verify}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const ownerPages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await createGroup(ownerPages, groupName, []);
      await ownerPages.conversationList().openConversation(groupName);

      await verify(ownerPages);
      await ownerPages.conversation().invitePeopleButton.click();

      await expect(ownerPages.guestOptions().guestsToggle).toHaveAttribute('data-uie-value', 'checked');
      await expect(ownerPages.guestOptions().createLinkButton).toBeVisible();
    });
  });

  test(
    'I want to see a system message when wireless guest has expired',
    {tag: ['@TC-3337', '@regression']},
    async ({createPage}) => {
      test.setTimeout(150_000);
      let createdLink: string;
      const [userAPage, guestPage] = await Promise.all([createPage(withLogin(userA)), createPage()]);

      const pages = PageManager.from(userAPage).webapp.pages;
      const guestPages = PageManager.from(guestPage).webapp.pages;

      await test.step('User A creates invite link', async () => {
        await createGroup(pages, groupName, []);
        createdLink = await generateGroupGuestsLink(pages, groupName);
      });

      await test.step('User B joins the group using the invitation link', async () => {
        await guestPage.goto(createdLink.toString());
        await guestPages.conversationJoin().joinBrowserButton.click();
        await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

        // Add expires_in query parameter to simulate account expiration
        const joinLink = new URL(guestPage.url());
        joinLink.searchParams.set('expires_in', '60');

        await guestPage.goto(joinLink.toString());
        await guestPages.conversationJoin().joinAsGuest(guestUser.firstName);
      });

      await test.step('User A sees guest details (to trigger access validation) after 1 minute', async () => {
        await pages.conversation().toggleGroupInformation();
        const guestMember = pages.conversationDetails().groupMembers.filter({hasText: guestUser.firstName});
        await expect(guestMember).toBeVisible({timeout: LOGIN_TIMEOUT});

        await userAPage.waitForTimeout(60_000);
        await pages.conversationDetails().openParticipantDetails(guestUser.firstName);
        await expect(pages.participantDetails().userStatus).toBeVisible();
      });

      await test.step('User A sees a system message when wireless guest has expired', async () => {
        await expect(
          pages.conversation().systemMessages.filter({hasText: `${guestUser.firstName} left`}),
        ).toBeVisible();
      });
    },
  );

  test(
    'I want to see Guests are present indicator if there are guests in the conversation',
    {tag: ['@TC-3338', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await createGroup(pages, groupName, []);
      const createdLink = await generateGroupGuestsLink(pages, groupName);

      await createPage(withGuestUser(createdLink, guestUser.firstName));
      await expect(pages.conversation().guestsIndicator).toBeVisible();
    },
  );

  [
    {
      description: 'I want to see the "Open in Wire" button if I was logged in permanently before',
      tag: '@TC-3351',
      verify: async (guestPages: PageManager['webapp']['pages'], guestPage: Page) => {
        await expect(guestPages.conversationJoin().joinAsMemberButton).toBeVisible();
        await expect(guestPage.getByText(`You are logged in as ${guestUser.fullName}`)).toBeVisible();
      },
    },
    {
      description: 'I want to see a link to join anonymously when I was logged in before',
      tag: '@TC-3352',
      verify: async (guestPages: PageManager['webapp']['pages'], guestPage: Page) => {
        await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();
        await expect(guestPage.getByRole('heading', {name: "Don't have an account?"})).toBeVisible();
      },
    },
  ].forEach(({description, tag, verify}) => {
    test(description, {tag: [tag, '@regression']}, async ({createPage}) => {
      const [userAPage, guestPage] = await Promise.all([
        createPage(withLogin(userA)),
        createPage(withLogin(guestUser)),
      ]);

      const guestPages = PageManager.from(guestPage).webapp.pages;
      const pages = PageManager.from(userAPage).webapp.pages;

      // UserA creates a guest link for a conversation
      await createGroup(pages, groupName, []);
      const createdLink = await generateGroupGuestsLink(pages, groupName);

      // Guest confirms that he was logged in before and can join the conversation directly
      await guestPage.goto(createdLink.toString());
      await guestPages.conversationJoin().joinBrowserButton.click();
      await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

      // WORKAROUND: The 'Join in Browser' button currently redirects to Production.
      // To maintain the existing logged-in session, we must force the invitation
      // URL to use the same environment as our current test session.
      const envUrl = new URL(process.env.WEBAPP_URL);
      const invitationLink = new URL(guestPage.url());

      invitationLink.hostname = envUrl.hostname;
      await guestPage.goto(invitationLink.toString());

      await verify(guestPages, guestPage);
    });
  });

  test(
    'I want to see my time left in left column list, participant details and account settings',
    {tag: ['@TC-3363', '@regression']},
    async ({createPage}) => {
      const pages = PageManager.from(await createPage(withLogin(userA))).webapp.pages;

      await createGroup(pages, groupName, []);
      const createdLink = await generateGroupGuestsLink(pages, groupName);

      const guestPage = await createPage(withGuestUser(createdLink, guestUser.firstName));
      const {pages: guestPages, modals: guestModals} = PageManager.from(guestPage).webapp;

      await guestModals.confirm().actionButton.click();
      await expect(guestPage.getByRole('complementary')).toContainText('24h left in this guest room');

      await guestPages.conversation().sendMessage('Message from Guest');
      const message = guestPages.conversation().getMessage({content: 'Message from Guest'});
      await message.getByTestId('element-avatar-temporary-guest').click();

      await expect(guestPage.getByTestId('status-expiration-text')).toContainText('24h left');
    },
  );

  test(
    'I want to see the conversation added to the conversation list',
    {tag: ['@TC-3354', '@regression']},
    async ({createPage}) => {
      const [userAPage, guestPage] = await Promise.all([
        createPage(withLogin(userA)),
        createPage(withLogin(guestUser)),
      ]);

      const guestPages = PageManager.from(guestPage).webapp.pages;
      const pages = PageManager.from(userAPage).webapp.pages;

      // UserA creates a guest link for a conversation
      await createGroup(pages, groupName, []);
      const createdLink = await generateGroupGuestsLink(pages, groupName);

      // Guest confirms that he was logged in before and can join the conversation directly
      await guestPage.goto(createdLink.toString());
      await guestPages.conversationJoin().joinBrowserButton.click();
      await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

      // WORKAROUND: The 'Join in Browser' button currently redirects to Production.
      // To maintain the existing logged-in session, we must force the invitation
      // URL to use the same environment as our current test session.
      const envUrl = new URL(process.env.WEBAPP_URL);
      const invitationLink = new URL(guestPage.url());

      invitationLink.hostname = envUrl.hostname;
      await guestPage.goto(invitationLink.toString());

      await guestPages.conversationJoin().joinAsMemberButton.click();
      await guestPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
      await expect(guestPages.conversationList().list.filter({hasText: groupName})).toBeVisible();
    },
  );

  test(
    'I want to get logged out with a reason when my account expires',
    {tag: ['@TC-3365', '@regression']},
    async ({createPage}) => {
      test.setTimeout(150_000);
      const [userAPage, guestPage] = await Promise.all([createPage(withLogin(userA)), createPage()]);
      let createdLink: string;

      const userAPageManager = PageManager.from(userAPage).webapp;
      const guestPageManager = PageManager.from(guestPage);
      const {pages: guestPages, modals: guestModals} = guestPageManager.webapp;
      const {pages} = userAPageManager;

      await test.step('User A creates invite link', async () => {
        await createGroup(pages, groupName, []);
        createdLink = await generateGroupGuestsLink(pages, groupName);
      });

      await test.step('User B joins the group using the invitation link', async () => {
        await guestPage.goto(createdLink.toString());
        await guestPages.conversationJoin().joinBrowserButton.click();
        await expect(guestPages.conversationJoin().joinAsGuestButton).toBeVisible();

        // Add expires_in query parameter to simulate account expiration
        const joinLink = new URL(guestPage.url());
        joinLink.searchParams.set('expires_in', '60');

        await guestPage.goto(joinLink.toString());
        await guestPages.conversationJoin().joinAsGuest(guestUser.firstName);
      });

      await test.step('User B sends a message in the conversation', async () => {
        await guestPages.conversation().conversationTitle.waitFor({state: 'visible', timeout: LOGIN_TIMEOUT});
        await guestModals.confirm().actionButton.click();
        await guestPages.conversation().sendMessage('Hello from Guest');
      });

      await test.step('User A sees guest details (to trigger access validation) after 1 minute', async () => {
        await pages.conversation().toggleGroupInformation();
        await userAPage.waitForTimeout(60_000);
        await pages.conversationDetails().openParticipantDetails(guestUser.firstName);
        await expect(pages.participantDetails().userStatus).toBeVisible();
      });

      await test.step('User B confirms that he was logged out due to expiration', async () => {
        await expect(guestPage.getByTestId('status-logout-reason')).toContainText(
          'You were signed out because your account was deleted.',
        );
      });
    },
  );

  const ssoUser = getUser({
    email: process.env.SCIM_USER_SSO_CODE,
    username: process.env.SCIM_USER_EMAIL,
    password: process.env.SCIM_USER_PASSWORD,
  });

  test(
    'I want to join guestroom invite with enterprise login',
    {tag: ['@TC-3477', '@regression']},
    async ({context, createPage}) => {
      const [userAPage, guestPage] = await Promise.all([createPage(withLogin(userA)), createPage(context)]);

      const userAPageManager = PageManager.from(userAPage).webapp;
      const guestPageManager = PageManager.from(guestPage);
      const {pages: guestPages, components: guestComponents} = guestPageManager.webapp;
      const {pages} = userAPageManager;

      await createGroup(pages, groupName, []);
      const createdLink = await generateGroupGuestsLink(pages, groupName);

      await guestPage.goto(createdLink.toString());
      await guestPages.conversationJoin().joinBrowserButton.click();
      await expect(guestPages.conversationJoin().enterpriseLoginButton).toBeVisible();

      await guestPages.conversationJoin().enterpriseLoginButton.click();
      await expect(guestPages.singleSignOn().header).toBeVisible();

      // Try to open the idp page (retry if it didn't open on the first try)
      const idpPagePromise = context.waitForEvent('page');
      await expect(async () => {
        await guestPages.singleSignOn().enterEmailOnSSOPage(ssoUser.email);
        await expect(idpPagePromise).resolves.toBeDefined();
      }).toPass();
      const idpPage = await idpPagePromise;

      await idpPage.getByRole('textbox', {name: 'Username'}).fill(ssoUser.username, {timeout: 20_000});
      await idpPage.getByRole('textbox', {name: 'Password'}).fill(ssoUser.password);
      await idpPage.getByRole('button', {name: 'Sign In'}).click();

      await guestPage.getByRole('button', {name: 'Remove device'}).first().click({timeout: LOGIN_TIMEOUT});
      // // We will also always be prompted to confirm the new history on this device
      await guestPages.historyInfo().clickConfirmButton();

      await expect(guestComponents.conversationSidebar().sidebar, `Login took more than ${LOGIN_TIMEOUT}s`).toBeVisible(
        {
          timeout: LOGIN_TIMEOUT,
        },
      );

      await expect(guestPages.conversationList().list.filter({hasText: groupName})).toBeVisible();
    },
  );
});
