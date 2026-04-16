import {User} from 'test/e2e_tests/data/user';
import {PageManager} from 'test/e2e_tests/pageManager';
import {test, withLogin, expect} from 'test/e2e_tests/test.fixtures';

test.describe('Invites', () => {
  let user: User;

  test.beforeEach(async ({createUser}) => {
    user = await createUser();
  });

  test('Invite people when you have no contacts', {tag: ['@TC-150', '@regression']}, async ({createPage}) => {
    const {pages, components, modals} = PageManager.from(await createPage(withLogin(user))).webapp;

    // Open connect with people sidebar & click invite people button
    await components.conversationSidebar().clickConnectButton();
    await pages.startUI().inviteButton.click();

    await expect(modals.invite().inviteText).toContainText(`I’m on Wire, search for @${user.username}`);
  });
});
