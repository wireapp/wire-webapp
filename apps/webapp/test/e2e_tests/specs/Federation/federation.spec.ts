import {Page} from 'playwright/test';
import {ApiManagerE2E} from 'test/e2e_tests/backend/apiManager.e2e';
import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withLogin, expect, createTeam} from 'test/e2e_tests/test.fixtures';
import {getAudioFilePath, getTextFilePath, getVideoFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {getImageFilePath} from 'test/e2e_tests/utils/sendImage.util';
import {createGroup, sendConnectionRequest} from 'test/e2e_tests/utils/userActions';

test.describe('Federation', () => {
  const federationBaseUrl = process.env.FEDERATION_WEBAPP_URL!;
  const federationApiManager = new ApiManagerE2E({
    backendUrl: process.env.FEDERATION_BACKEND_URL!,
    basicAuth: process.env.FEDERATION_BASIC_AUTH!,
  });

  let normalUser: User;
  let federatedUser: User;

  test.beforeEach(async ({api}) => {
    normalUser = (await createTeam(api, 'Normal Team')).owner;
    federatedUser = (await createTeam(federationApiManager, 'Federated Team')).owner;
  });

  test.afterEach(async ({api}) => {
    await api.team.deleteTeam(normalUser, normalUser.teamId);
    await federationApiManager.team.deleteTeam(federatedUser, federatedUser.teamId);
  });

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
        await createGroup(federatedUserPages, 'Federation group', []);
        await federatedUserPages.conversationList().getConversation('Federation group').open();
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

        await normalUserPages.conversationList().getConversation('Federation group').open();
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

      for (const {name, sendAction, verify} of testCases) {
        await test.step(`Verify user sends ${name} and federated user can see it`, async () => {
          await sendAction({normalUserPage});
          await verify({federatedUserPage});
        });
      }
    },
  );

  test('I want to start a 1:1 call with a federated User', {tag: ['@TC-3208', '@regression']}, async ({createPage}) => {
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

    await normalUserPages.conversation().callButton.click();
    await federatedUserPages.calling().acceptCallButton.click();

    await normalUserPages.calling().toggleVideoButton.click();
    await federatedUserPages.calling().toggleVideoButton.click();

    const normalUserCall = await normalUserPages.calling().maximizeCell();
    const federatedUserCall = await federatedUserPages.calling().maximizeCell();

    await expect(normalUserCall.getCallingParticipant(federatedUser.fullName).muteIcon).not.toBeVisible();
    await expect(normalUserCall.getGridTile(federatedUser.fullName).videoElement).toBeVisible();

    await expect(federatedUserCall.getCallingParticipant(normalUser.fullName).muteIcon).not.toBeVisible();
    await expect(federatedUserCall.getGridTile(normalUser.fullName).videoElement).toBeVisible();
  });
});
