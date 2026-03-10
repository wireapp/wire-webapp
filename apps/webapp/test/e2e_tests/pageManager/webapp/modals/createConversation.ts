import {Page} from 'playwright/test';
import {User} from 'test/e2e_tests/data/user';

/**
 * Component Object Model for the CreateConversation dialog.
 * It allows for creation of groups as well as channels (if the feature is enabled).
 */
export const CreateConversationModal = (page: Page) => {
  const modal = page.getByRole('dialog');

  const nextButton = modal.getByRole('button', {name: 'Next', exact: true});
  const doneButton = modal.getByRole('button', {name: 'Done', exact: true});

  const addMembers = async (members: User[]) => {
    for (const {username} of members) {
      await modal.getByRole('textbox', {name: 'Search'}).fill(username);
      await modal.getByRole('listitem').filter({hasText: username}).click();
    }
  };

  /** Walk through the creation process of a group with the given name and options */
  const createGroup = async (name: string, options?: {members?: User[]}) => {
    await modal.getByText('New Group').click();
    await modal.getByRole('textbox', {name: 'Group name'}).fill(name);

    await nextButton.click();

    if (options.members) {
      await addMembers(options.members);
    }

    await doneButton.click();
  };

  /** Walk through the creation process of a channel with the given name and options */
  const createChannel = async (name: string, options?: {members?: User[]}) => {
    await modal.getByText('New Channel').click();
    await modal.getByRole('textbox', {name: 'Channel name'}).fill(name);

    await nextButton.click();
    await nextButton.click();

    if (options.members) {
      await addMembers(options.members);
    }

    await doneButton.click();
  };

  return {
    createGroup,
    createChannel,
  };
};
