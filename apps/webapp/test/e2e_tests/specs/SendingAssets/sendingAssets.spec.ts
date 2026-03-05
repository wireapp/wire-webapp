import {User} from 'test/e2e_tests/data/user';
import {test, expect, withLogin, withConnectedUser} from '../../test.fixtures';
import {PageManager} from 'test/e2e_tests/pageManager';
import {getTextFilePath, shareAssetHelper} from 'test/e2e_tests/utils/asset.util';
import {Buffer} from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createGroup} from 'test/e2e_tests/utils/userActions';

test.describe('Sending Assets', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createUser, createTeam}) => {
    userB = await createUser();
    const team = await createTeam('Test Team', {users: [userB]});
    userA = team.owner;
  });

  test('Verify warning is shown if file size is too big', {tag: ['@TC-767', '@regression']}, async ({createPage}) => {
    const page = await createPage(withLogin(userA), withConnectedUser(userB));
    const {pages, modals} = PageManager.from(page).webapp;
    await createGroup(pages, 'Test Group', [userB]);

    // Verify uploading a file exceeding the limit isn't possible for both, 1on1 and group conversations
    for (const conversation of [userB.fullName, 'Test Group']) {
      await test.step(`Try sending a too big file to ${conversation}`, async () => {
        await pages.conversationList().openConversation(conversation);
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          page.getByRole('button', {name: 'Add file'}).click(),
        ]);

        const tempFilePath = path.join(tmpdir(), '100MB-testfile.tmp');
        try {
          // Create and upload a random generated 101MB file
          await fs.writeFile(tempFilePath, Buffer.allocUnsafe(101 * 2 ** 20));
          await fileChooser.setFiles(tempFilePath);
        } finally {
          await fs.rm(tempFilePath); // Ensure the file get's cleaned up again
        }

        // Verify modal is shown that the file is too large
        await expect(modals.acknowledge().modalTitle).toContainText('File too large');
        await modals.acknowledge().actionButton.click();

        // Ensure the message wasn't sent
        await expect(pages.conversation().getMessage({sender: userA})).not.toBeAttached();
      });
    }
  });

  test(
    'I should not be able to download files that were manipulated with wrong hash or invalid hash',
    {tag: ['@TC-777', '@regression']},
    async ({createPage}) => {
      const [userAPage, userBPage] = await Promise.all([
        createPage(withLogin(userA), withConnectedUser(userB)),
        createPage(withLogin(userB)),
      ]);
      const userAPages = PageManager.from(userAPage).webapp.pages;
      const userBPages = PageManager.from(userBPage).webapp.pages;

      await userAPages.conversationList().openConversation(userB.fullName, {protocol: 'mls'});
      await userBPages.conversationList().openConversation(userA.fullName, {protocol: 'mls'});

      await shareAssetHelper(getTextFilePath(), userAPage, userAPage.getByRole('button', {name: 'Add file'}));

      // Intercept requests to the assets endpoint for userB and return a manipulated response instead
      await userBPage.route('**/assets/**', async route => {
        await route.fulfill({
          body: Buffer.alloc(1), // Create random 1 byte file
        });
      });

      const fileMessage = userBPages.conversation().getMessage({sender: userA});
      await fileMessage.getByRole('button', {name: 'Download'}).click();

      await expect(fileMessage).toContainText('Download failed (hash does not match)', {ignoreCase: true});
    },
  );
});
