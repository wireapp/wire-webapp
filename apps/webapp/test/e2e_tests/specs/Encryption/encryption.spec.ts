import {PageManager} from 'test/e2e_tests/pageManager';
import {test, expect, withLogin} from 'test/e2e_tests/test.fixtures';
import {connectWithUser, createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Encryption', () => {
  // Test is skipped due to the unread messages being lost during migration (See: WPB-25346)
  test.skip(
    'Migrate 1:1 conversations',
    {tag: ['@TC-8736', '@regression']},
    async ({createTeam, createUser, createPage, api}) => {
      const userA = await createUser();
      const userB = await createUser();
      const proteusTeam = await createTeam('Proteus Team', {
        users: [userA, userB],
        features: {
          mls: {status: 'disabled', defaultProtocol: 'proteus', supportedProtocols: ['proteus']},
        },
      });

      const [userAPage, userBPage] = await Promise.all([createPage(withLogin(userA)), createPage(withLogin(userB))]);
      await connectWithUser(userAPage, userB);

      const {pages: userAPages, modals: userAModals} = PageManager.from(userAPage).webapp;
      const {pages: userBPages, modals: userBModals} = PageManager.from(userBPage).webapp;

      await createGroup(userAPages, 'Distraction Group', []);
      await userAPages.conversationList().getConversation('Distraction Group').open();
      await userBPages.conversationList().getConversation(userA.fullName).open();

      await test.step('Send messages & verify the conversation uses proteus', async () => {
        await userBPages.conversation().sendMessage('Message before migration');
        await userBPages.conversation().clickConversationInfoButton();
        await expect(userBPages.conversationDetails().protocol).toHaveText('PROTEUS');
      });

      await test.step('Migrate team to MLS', async () => {
        await api.brig.configureMLSFeature(proteusTeam.teamId, {
          status: 'enabled',
          defaultProtocol: 'mls',
          supportedProtocols: ['mls', 'proteus'],
        });
      });

      await test.step('Both users reload the app via the MLS modal', async () => {
        for (const modal of [userAModals, userBModals]) {
          await expect(modal.confirm().modal).toBeVisible();
          await expect(modal.confirm().modalTitle).toContainText('New messaging protocol');
          await modal.confirm().actionButton.click();
        }
      });

      await test.step('User A still sees the correct unread count after migration', async () => {
        const mlsConversation = userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'});
        await expect(mlsConversation).toBeVisible();
        await expect(mlsConversation.unreadIndicator).toBeVisible();
        await expect(mlsConversation.unreadIndicator).toContainText('1'); // There should be one unread message
      });

      await test.step('Both users see MLS as protocol in the conversation details', async () => {
        await userAPages.conversationList().getConversation(userB.fullName, {protocol: 'mls'}).open();
        await userBPages.conversationList().getConversation(userA.fullName, {protocol: 'mls'}).open();

        for (const pages of [userAPages, userBPages]) {
          await pages.conversation().clickConversationInfoButton();
          await expect(pages.conversationDetails().protocol).toHaveText('MLS');
        }
      });
    },
  );
});
