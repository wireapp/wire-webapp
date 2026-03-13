import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {expect, test, withConnectedUser, withLogin} from 'test/e2e_tests/test.fixtures';

test.describe('Thread', () => {
  let userA: User;
  let userB: User;

  test.beforeEach(async ({createTeam}) => {
    const team = await createTeam('Thread Team', {withMembers: 1});
    userA = team.owner;
    userB = team.members[0];
  });

  test('I can start a thread from a message and keep focus after send', async ({createPage}) => {
    const pages = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

    await pages.conversation().sendMessage('Thread root message');
    const rootMessage = pages.conversation().getMessage({content: 'Thread root message'});

    await pages.conversation().startThreadForMessage(rootMessage);

    await expect(pages.conversation().messageThreadPanel).toBeVisible();
    await expect(pages.conversation().messageThreadInput).toBeFocused();
    await expect(pages.conversation().page.getByTestId('message-thread-title')).toContainText('Thread - 0 replies');

    await pages.conversation().messageThreadInput.fill('Thread reply 1');
    await pages.conversation().messageThreadInput.press('Enter');

    await expect(pages.conversation().page.getByTestId('message-thread-title')).toContainText('Thread - 1 reply');
    await expect(pages.conversation().messageThreadPanel.getByText('Thread reply 1')).toBeVisible();
    await expect(pages.conversation().messageThreadInput).toBeFocused();

    await pages.conversation().messageThreadInput.fill('Thread reply 2');
    await pages.conversation().messageThreadInput.press('Enter');
    await expect(pages.conversation().page.getByTestId('message-thread-title')).toContainText('Thread - 2 replies');

    const threadMessages = pages.conversation().messageThreadPanel.getByTestId('item-message');
    await expect(threadMessages.nth(0)).toContainText('Thread root message');
    await expect(threadMessages.nth(1)).toContainText('Thread reply 1');
    await expect(threadMessages.nth(2)).toContainText('Thread reply 2');
  });

  test('I can open thread from the replies badge under the root message', async ({createPage}) => {
    const pages = (await PageManager.from(createPage(withLogin(userA), withConnectedUser(userB)))).webapp.pages;

    await pages.conversation().sendMessage('Reply badge root');
    const rootMessage = pages.conversation().getMessage({content: 'Reply badge root'});

    await pages.conversation().startThreadForMessage(rootMessage);
    await pages.conversation().sendThreadMessage('Reply badge threaded message');

    await pages.conversation().messageThreadPanel.getByTestId('do-close').click();
    await expect(pages.conversation().messageThreadPanel).not.toBeVisible();

    await expect(rootMessage.getByTestId('do-open-message-thread')).toContainText('1 reply');

    await pages.conversation().openThreadFromRepliesBadge(rootMessage);

    await expect(pages.conversation().messageThreadPanel).toBeVisible();
    await expect(pages.conversation().messageThreadPanel.getByText('Reply badge threaded message')).toBeVisible();
  });
});
