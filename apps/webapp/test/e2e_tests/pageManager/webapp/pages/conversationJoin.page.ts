import {Page} from 'playwright/test';

/** Page shown to users using a guest link to join a group conversation */
export const ConversationJoinPage = (page: Page) => {
  const joinAsGuest = async (name: string) => {
    await page.getByRole('textbox', {name: 'Your name'}).fill(name);
    // It's necessary to specify a position since the text contains a link which would be clicked instead of the checkbox
    await page.getByText(/I accept .* terms of use/i).click({position: {x: 0, y: 8}});
    await page.getByRole('button', {name: 'Join as Temporary Guest'}).click();
  };

  return {
    joinAsGuest,
  };
};
