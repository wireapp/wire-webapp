import {Page} from 'playwright/test';
import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withLogin, expect, createTeam} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createAndSaveBackup, createGroup, sendConnectionRequest} from 'test/e2e_tests/utils/userActions';

test.describe('Federation', () => {
  const federationBaseUrl = process.env.FEDERATION_WEBAPP_URL!;
  const federationApiManager = new ApiManagerE2E({
    backendUrl: process.env.FEDERATION_BACKEND_URL!,
    basicAuth: process.env.FEDERATION_BASIC_AUTH!,
  });

  let normalUser: User;
  let federatedUser: User;
  const groupName = 'Federated group';

  test.beforeEach(async ({api}) => {
    normalUser = (await createTeam(api, 'Normal Team', {features: {conferenceCalling: true}})).owner;
    federatedUser = (await createTeam(federationApiManager, 'Federated Team')).owner;
  });

  test.afterEach(async ({api}) => {
    await api.team.deleteTeam(normalUser, normalUser.teamId);
    await federationApiManager.team.deleteTeam(federatedUser, federatedUser.teamId);
  });

  const testCases = [
    {
      name: 'Image',
      sendAction: async ({normalUserPage}) => {
        await shareAssetHelper(
          getImageFilePath(),
          normalUserPage,
          normalUserPage.getByRole('button', {name: 'Add picture'}),
        );
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const messageWithImage = federatedUserPages
          .conversation()
          .getMessage({sender: normalUser})
          .filter({has: federatedUserPage.getByRole('img')});
        await expect(messageWithImage).toBeVisible();
      },
    },
    {
      name: 'Text',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        await normalUserPages.conversation().sendMessage('Test message');
        await expect(normalUserPages.conversation().getMessage({content: 'Test message'})).toBeVisible();
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const message = federatedUserPages.conversation().getMessage({content: 'Test message'});
        await expect(message).toBeVisible();
      },
    },
    {
      name: 'Link',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        await normalUserPages.conversation().sendMessage('https://www.lidl.de/');
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const message = federatedUserPages.conversation().getMessage({content: 'https://www.lidl.de/'});
        await expect(message).toBeVisible();
      },
    },
    {
      name: 'Audio',
      sendAction: async ({normalUserPage}) => {
        await shareAssetHelper(
          getAudioFilePath(),
          normalUserPage,
          normalUserPage.getByRole('button', {name: 'Add file'}),
        );
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const messageWithAudio = federatedUserPages
          .conversation()
          .getMessage({sender: normalUser})
          .filter({has: federatedUserPage.locator('[data-uie-name="audio-asset"]')});
        await expect(messageWithAudio).toBeVisible();
      },
    },
    {
      name: 'Video',
      sendAction: async ({normalUserPage}) => {
        await shareAssetHelper(
          getVideoFilePath(),
          normalUserPage,
          normalUserPage.getByRole('button', {name: 'Add file'}),
        );
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const messageWithVideo = federatedUserPages
          .conversation()
          .getMessage({sender: normalUser})
          .filter({has: federatedUserPage.locator('[data-uie-name="video-asset"]')});
        await expect(messageWithVideo).toBeVisible();
      },
    },
    {
      name: 'File',
      sendAction: async ({normalUserPage}) => {
        await shareAssetHelper(
          getTextFilePath(),
          normalUserPage,
          normalUserPage.getByRole('button', {name: 'Add file'}),
        );
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const messageWithFile = federatedUserPages
          .conversation()
          .getMessage({sender: normalUser})
          .filter({has: federatedUserPage.locator('[data-uie-name="file-asset"]')});
        await expect(messageWithFile).toBeVisible();
      },
    },
    {
      name: 'Ping',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        await normalUserPages.conversation().sendPing();
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        await expect(federatedUserPages.conversation().getPing()).toBeVisible();
      },
    },
    {
      name: 'Ephemeral text message',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        await normalUserPages.conversation().enableSelfDeletingMessages();
        await normalUserPages.conversation().sendMessage('Gone in 10s');
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        await expect(federatedUserPages.conversation().getMessage({content: 'Gone in 10s'})).toBeVisible();

        await federatedUserPage.waitForTimeout(10_000); // Wait for 10s so the message is deleted
        await expect(federatedUserPages.conversation().getMessage({content: 'Gone in 10s'})).not.toBeVisible();
      },
    },
    {
      name: 'Reaction',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        const message = normalUserPages.conversation().getMessage({content: 'Test message'});
        await expect(message).toBeVisible();
        await normalUserPages.conversation().reactOnMessage(message, 'plus-one');
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const messageWithReaction = federatedUserPages.conversation().getMessage({content: 'Test message'});
        await expect(
          federatedUserPages.conversation().getReactionOnMessage(messageWithReaction, 'plus-one'),
        ).toBeVisible();
      },
    },
    {
      name: 'Reply',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        const message = normalUserPages.conversation().getMessage({content: 'Test message'});

        await expect(message).toBeVisible();
        await normalUserPages.conversation().replyToMessage(message);
        await normalUserPages.conversation().sendMessage('Reply');
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        const replyMessage = federatedUserPages.conversation().getMessage({content: 'Reply'});
        await expect(replyMessage.getByTestId('quote-item')).toContainText('Test message');
      },
    },
    {
      name: 'Mention',
      sendAction: async ({normalUserPage}) => {
        const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
        await normalUserPages.conversation().sendMessageWithUserMention(federatedUser.fullName, 'Test mention');
      },
      verify: async ({federatedUserPage}) => {
        const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
        await expect(
          federatedUserPages.conversation().getMessage({content: `@${federatedUser.fullName}`}),
        ).toBeVisible();
      },
    },
  ] as const satisfies {
    name: string;
    sendAction: (params: {normalUserPage: Page}) => Promise<void>;
    verify: (params: {federatedUserPage: Page}) => Promise<void>;
  }[];

  test(
    'I want to share all possible assets in a federated group',
    {tag: ['@TC-8758', '@regression']},
    async ({createPage}) => {
      const [normalUserPage, federatedUserPage] = await Promise.all([
        createPage(withLogin(normalUser)),
        createPage(withLogin(federatedUser, {baseUrl: federationBaseUrl})),
      ]);
      await sendConnectionRequest(normalUserPage, federatedUser);

      const {pages: normalUserPages} = PageManager.from(normalUserPage).webapp;
      const {pages: federatedUserPages} = PageManager.from(federatedUserPage).webapp;

      await federatedUserPages.conversationList().openPendingConnectionRequest();
      await federatedUserPages.connectRequest().clickConnectButton();
      await expect(
        federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}),
      ).toBeVisible();

      await test.step('Federated user creates a group and adds normal user to it', async () => {
        await createGroup(federatedUserPages, groupName, []);
        await federatedUserPages.conversationList().getConversation(groupName).open();
        await federatedUserPages.conversation().toggleGroupInformation();
        await federatedUserPages.conversationDetails().clickAddPeopleButton();
        await federatedUserPages.conversationDetails().addUsersToConversation([normalUser.fullName]);

        await expect(
          federatedUserPages.conversation().systemMessages.filter({hasText: `You added ${normalUser.fullName}`}),
        ).toBeVisible();
        await expect(federatedUserPages.conversation().statusIndicator).toContainText('Federated users are present');
        await expect(
          federatedUserPages.conversationDetails().getParticipant(normalUser.fullName).federatedIcon,
        ).toBeVisible();

        await normalUserPages.conversationList().getConversation(groupName).open();
        await expect(
          normalUserPages
            .conversation()
            .systemMessages.filter({hasText: `${federatedUser.fullName} added you to the conversation`}),
        ).toBeVisible();
      });

      await test.step('Normal user can send and delete Text message in the federated group', async () => {
        await normalUserPages.conversation().sendMessage('Hello from staging user');

        const messageNormalUser = normalUserPages.conversation().getMessage({sender: normalUser});
        await expect(messageNormalUser).toBeVisible();
        await expect(federatedUserPages.conversation().getMessage({sender: normalUser})).toBeVisible();

        await normalUserPages.conversation().deleteMessage(messageNormalUser, 'Everyone');
        await expect(messageNormalUser).not.toBeVisible();
        await expect(federatedUserPage.getByTestId('element-message-delete')).toBeVisible();
      });

      for (const {name, sendAction, verify} of testCases) {
        await test.step(`Verify user sends ${name} and federated user can see it`, async () => {
          await sendAction({normalUserPage});
          await verify({federatedUserPage});
        });
      }
    },
  );

  test(
    'I want to share all possible assets in a federated 1:1',
    {tag: ['@TC-8759', '@regression']},
    async ({createPage}) => {
      const [normalUserPage, federatedUserPage] = await Promise.all([
        createPage(withLogin(normalUser)),
        createPage(withLogin(federatedUser, {baseUrl: federationBaseUrl})),
      ]);
      await sendConnectionRequest(normalUserPage, federatedUser);

      const {pages: normalUserPages} = PageManager.from(normalUserPage).webapp;
      const {pages: federatedUserPages} = PageManager.from(federatedUserPage).webapp;

      await federatedUserPages.conversationList().openPendingConnectionRequest();
      await federatedUserPages.connectRequest().clickConnectButton();

      await normalUserPages.conversationList().getConversation(federatedUser.fullName, {protocol: 'mls'}).open();
      await federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}).open();

      for (const {name, sendAction, verify} of testCases) {
        await test.step(`Verify user sends ${name} and federated user can see it`, async () => {
          await sendAction({normalUserPage});
          await verify({federatedUserPage});
        });
      }
    },
  );

  test(
    'I want to import my backup of conversations with users from different BE and see the conversation contents',
    {tag: ['@TC-3128', '@regression']},
    async ({createPage}, testInfo) => {
      const [normalUserPage, federatedUserPage] = await Promise.all([
        createPage(withLogin(normalUser)),
        createPage(withLogin(federatedUser, {baseUrl: federationBaseUrl})),
      ]);

      const normalUserPageManager = PageManager.from(normalUserPage);
      const {
        pages: normalUserPages,
        components: normalUserComponents,
        modals: normalUserModals,
      } = normalUserPageManager.webapp;
      const {pages: federatedUserPages} = PageManager.from(federatedUserPage).webapp;

      await test.step('Establish connection between normal and federated user', async () => {
        await sendConnectionRequest(normalUserPage, federatedUser);
        await federatedUserPages.conversationList().openPendingConnectionRequest();
        await federatedUserPages.connectRequest().clickConnectButton();
      });

      await test.step('Exchange direct messages and verify receipt', async () => {
        await normalUserPages.conversationList().getConversation(federatedUser.fullName, {protocol: 'mls'}).open();
        await federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}).open();

        await normalUserPages.conversation().sendMessage('Message from normal user');
        await federatedUserPages.conversation().sendMessage('Message from federated user');

        await expect(normalUserPages.conversation().getMessage({sender: federatedUser})).toBeVisible();
        await expect(federatedUserPages.conversation().getMessage({sender: normalUser})).toBeVisible();
      });

      await test.step('Create a group chat and exchange text and image messages', async () => {
        await createGroup(federatedUserPages, groupName, [normalUser]);
        await federatedUserPages.conversationList().getConversation(groupName).open();
        await normalUserPages.conversationList().getConversation(groupName).open();

        await federatedUserPages.conversation().sendMessage('Group message from federated user');
        await shareAssetHelper(
          getImageFilePath(),
          federatedUserPage,
          federatedUserPage.getByRole('button', {name: 'Add picture'}),
        );

        await expect(
          normalUserPages.conversation().getMessage({content: 'Group message from federated user'}),
        ).toBeVisible();

        const messageWithImage = normalUserPages
          .conversation()
          .getMessage({sender: federatedUser})
          .filter({has: normalUserPage.getByRole('img')});
        await expect(messageWithImage).toBeVisible();
      });

      let backupName: string;
      await test.step('Create and save backup for the normal user', async () => {
        await normalUserComponents.conversationSidebar().clickPreferencesButton();
        backupName = await createAndSaveBackup(testInfo, normalUserPageManager);
      });

      await test.step('Log out the normal user from the first device', async () => {
        await normalUserComponents.conversationSidebar().clickPreferencesButton();
        await normalUserPages.account().clickLogoutButton();
        await expect(normalUserModals.confirmLogout().modal).toBeVisible();
        await normalUserModals.confirmLogout().clickConfirm();
      });

      // --- Second Device Flow ---
      const normalUserDevice2 = await createPage(withLogin(normalUser, {confirmNewHistory: true}));

      const {pages: normalUserDevice2Pages, components: normalUserDevice2Components} =
        PageManager.from(normalUserDevice2).webapp;

      await test.step('Import backup on the new device', async () => {
        await normalUserDevice2Components.conversationSidebar().clickPreferencesButton();
        await normalUserDevice2Pages.account().backupFileInput.setInputFiles(backupName);
        await normalUserDevice2Components.conversationSidebar().allConversationsButton.click();
      });

      await test.step('Verify direct messages are restored on the new device', async () => {
        await normalUserDevice2Pages
          .conversationList()
          .getConversation(federatedUser.fullName, {protocol: 'mls'})
          .open();
        await expect(normalUserDevice2Pages.conversation().getMessage({sender: federatedUser})).toBeVisible();
      });

      await test.step('Verify group messages and media are restored on the new device', async () => {
        await normalUserDevice2Pages.conversationList().getConversation(groupName).open();
        await expect(normalUserDevice2Pages.conversation().getMessage({sender: federatedUser})).toBeVisible();

        const messageWithImage2Device = normalUserDevice2Pages
          .conversation()
          .getMessage({sender: normalUser})
          .filter({has: normalUserDevice2.getByRole('img')});
        await expect(messageWithImage2Device).toBeVisible();
      });
    },
  );

  test(
    'I want to be able to connect to, block, and unblock a user from different backend',
    {tag: ['@TC-3129', '@regression']},
    async ({createPage}) => {
      const [normalUserPage, federatedUserPage] = await Promise.all([
        createPage(withLogin(normalUser)),
        createPage(withLogin(federatedUser, {baseUrl: federationBaseUrl})),
      ]);

      const {
        pages: normalUserPages,
        components: normalUserComponents,
        modals: normalUserModals,
      } = PageManager.from(normalUserPage).webapp;

      const {pages: federatedUserPages} = PageManager.from(federatedUserPage).webapp;

      const userHandle = federatedUser.qualifiedId?.domain
        ? `${federatedUser.username}@${federatedUser.qualifiedId?.domain}`
        : federatedUser.username;

      await test.step('Send connection request to federated user', async () => {
        await normalUserComponents.conversationSidebar().clickConnectButton();
        await normalUserPages.startUI().searchInput.fill(userHandle);

        const normalUserSearchRow = normalUserPages.startUI().searchResults.filter({hasText: federatedUser.username});
        await expect(normalUserSearchRow).toBeVisible();
        await expect(normalUserSearchRow.getByTestId('status-federated-user')).toBeVisible();

        await normalUserPages.startUI().selectUsers(userHandle);
        await normalUserModals.userProfile().clickConnectButton();
      });

      await test.step('Accept connection request from normal user', async () => {
        await federatedUserPages.conversationList().openPendingConnectionRequest();
        await federatedUserPages.connectRequest().clickConnectButton();
      });

      await test.step('Open conversation on both ends', async () => {
        await Promise.all([
          normalUserPages.conversationList().getConversation(federatedUser.fullName, {protocol: 'mls'}).open(),
          federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}).open(),
        ]);
      });

      await test.step('Verify conversation details and cross-backend presence indicators', async () => {
        await normalUserPages.conversation().toggleGroupInformation();

        await expect(normalUserPages.participantDetails().userName).toBeVisible();
        await expect(normalUserPages.participantDetails().userHandle).toBeVisible();
        await expect(normalUserPages.conversation().statusIndicator).toContainText('Federated users are present');
        await expect(normalUserPages.conversation().conversationTitle).toContainText(federatedUser.fullName);
        await expect(
          normalUserPages.conversation().systemMessages.filter({hasText: federatedUser.username}),
        ).toBeVisible();
      });

      await test.step('Exchange messages between normal and federated users', async () => {
        await normalUserPages.conversation().sendMessage('Message from normal user');
        await federatedUserPages.conversation().sendMessage('Message from federated user');

        await expect(normalUserPages.conversation().getMessage({sender: federatedUser})).toBeVisible();
        await expect(federatedUserPages.conversation().getMessage({sender: normalUser})).toBeVisible();
      });

      await test.step('Block the federated user and verify status', async () => {
        await normalUserPages.participantDetails().blockUser();
        await normalUserModals.confirm().actionButton.click();

        await expect(normalUserPages.participantDetails().userPicture).toHaveAttribute('data-uie-status', 'blocked');
      });

      await test.step('Unblock the federated user and verify status restoration', async () => {
        await normalUserPages.participantDetails().unblockButton.click();
        await normalUserModals.confirm().actionButton.click();

        await expect(normalUserPages.participantDetails().userPicture).not.toHaveAttribute(
          'data-uie-status',
          'blocked',
        );
      });
    },
  );

  const testData = [
    {
      title: 'I want to start a 1:1 call with a federated User',
      tags: ['@TC-3208', '@regression'],
      type: '1:1',
    },
    {
      title: 'I want to start a conference call in a federated group with Users from 2 different backends',
      tags: ['@TC-3220', '@regression'],
      type: 'group',
    },
  ];

  testData.forEach(({title, tags, type}) => {
    test(title, {tag: tags}, async ({createPage}) => {
      const [normalUserPage, federatedUserPage] = await Promise.all([
        createPage(withLogin(normalUser)),
        createPage(withLogin(federatedUser, {baseUrl: federationBaseUrl})),
      ]);

      const normalUserPages = PageManager.from(normalUserPage).webapp.pages;
      const federatedUserPages = PageManager.from(federatedUserPage).webapp.pages;
      const groupName = 'Federation call group';

      await test.step('Connect federated users', async () => {
        await sendConnectionRequest(normalUserPage, federatedUser);
        await federatedUserPages.conversationList().openPendingConnectionRequest();
        await federatedUserPages.connectRequest().clickConnectButton();
      });

      await test.step('Users open conversations', async () => {
        if (type === '1:1') {
          await normalUserPages.conversationList().getConversation(federatedUser.fullName, {protocol: 'mls'}).open();
          await federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}).open();
        } else {
          await expect(
            federatedUserPages.conversationList().getConversation(normalUser.fullName, {protocol: 'mls'}),
          ).toBeVisible();

          await createGroup(federatedUserPages, groupName, [normalUser]);
          await normalUserPages.conversationList().getConversation(groupName).open();
          await federatedUserPages.conversationList().getConversation(groupName).open();
        }
      });

      await test.step('Start and accept call', async () => {
        await normalUserPages.conversation().callButton.click();
        await expect(normalUserPages.calling().callCell).toBeVisible();
        await federatedUserPages.calling().acceptCallButton.click();
      });

      await test.step('Enable video streams', async () => {
        await normalUserPages.calling().toggleVideoButton.click();
        await federatedUserPages.calling().toggleVideoButton.click();
      });

      const normalUserCall = await normalUserPages.calling().maximizeCell();
      const federatedUserCall = await federatedUserPages.calling().maximizeCell();

      await test.step('Verify initial media connection', async () => {
        // Normal User UI Checks
        await expect(normalUserCall.getCallingParticipant(federatedUser.fullName).muteIcon).not.toBeVisible();
        await expect(normalUserCall.getGridTile(federatedUser.fullName).videoElement).toBeVisible();

        // Federated User UI Checks
        await expect(federatedUserCall.getCallingParticipant(normalUser.fullName).muteIcon).not.toBeVisible();
        await expect(federatedUserCall.getGridTile(normalUser.fullName).videoElement).toBeVisible();
      });

      // Conditionally execute group-only interaction steps
      if (type === 'group') {
        await test.step('Verify screen sharing controls', async () => {
          await normalUserCall.toggleVideoButton.click();
          await expect(federatedUserCall.getGridTile(normalUser.fullName).videoElement).not.toBeVisible();

          await normalUserCall.toggleScreenShareButton.click();
          await expect(normalUserCall.selfVideoThumbnail.locator('video')).toBeVisible();
          await expect(federatedUserCall.getGridTile(normalUser.fullName).videoElement).toBeVisible();
        });
      }
    });
  });
});
