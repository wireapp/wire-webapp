import {Page} from 'playwright/test';

/** COM for the modal shown when someone clicks the "Invite people" button inside the start UI (only visible if the user has no connections yet) */
export const InviteModal = (page: Page) => {
  const modal = page.getByTestId('modal-invite');
  const inviteText = modal.getByRole('textbox');

  return {inviteText};
};
