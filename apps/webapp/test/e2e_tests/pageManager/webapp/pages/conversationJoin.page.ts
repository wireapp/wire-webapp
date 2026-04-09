import {Page} from 'playwright/test';

/** Page shown to users using a guest link to join a group conversation */
export const ConversationJoinPage = (page: Page) => {
  const joinBrowserButton = page.getByTestId('do-conversation-join-webapp');
  const nameInput = page.getByRole('textbox', {name: 'Your name'});
  const acceptTermsCheckBox = page.getByText(/I accept .* terms of use/i);
  const joinAsGuestButton = page.getByRole('button', {name: 'Join as Temporary Guest'});

  const joinAsGuest = async (name: string) => {
    await nameInput.fill(name);
    // It's necessary to specify a position since the text contains a link which would be clicked instead of the checkbox
    await acceptTermsCheckBox.click({position: {x: 0, y: 8}});
    await joinAsGuestButton.click();
  };

  return {
    joinAsGuest,
    joinBrowserButton,
    joinAsGuestButton,
  };
};
