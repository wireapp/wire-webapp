import {Page} from 'playwright/test';
import type {Locator} from 'playwright-core';

/** Page shown to users using a guest link to join a group conversation */
type ConversationJoinPageResult = {
  joinAsGuest: (name: string) => Promise<void>;
  joinBrowserButton: Locator;
  joinAsGuestButton: Locator;
  joinAsMemberButton: Locator;
  enterpriseLoginButton: Locator;
};
export const ConversationJoinPage = (page: Page): ConversationJoinPageResult => {
  const joinBrowserButton = page.getByTestId('do-conversation-join-webapp');
  const nameInput = page.getByRole('textbox', {name: 'Your name'});
  const acceptTermsCheckBox = page.getByText(/I accept .* terms of use/i);
  const joinAsGuestButton = page.getByRole('button', {name: 'Join as Temporary Guest'});
  const joinAsMemberButton = page.getByRole('button', {name: 'Join', exact: true});
  const enterpriseLoginButton = page.getByRole('button', {name: 'Enterprise Login'});

  const joinAsGuest = async (name: string): Promise<void> => {
    await nameInput.fill(name);
    // It's necessary to specify a position since the text contains a link which would be clicked instead of the checkbox
    await acceptTermsCheckBox.click({position: {x: 0, y: 8}});
    await joinAsGuestButton.click();
  };

  return {
    joinAsGuest,
    joinBrowserButton,
    joinAsGuestButton,
    joinAsMemberButton,
    enterpriseLoginButton,
  };
};
