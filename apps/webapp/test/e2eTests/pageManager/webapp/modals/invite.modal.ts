import {Page} from 'playwright/test';
import type {Locator} from 'playwright-core';

/** COM for the modal shown when someone clicks the "Invite people" button inside the start UI (only visible if the user has no connections yet) */
type InviteModalResult = {inviteText: Locator};
export const InviteModal = (page: Page): InviteModalResult => {
  const modal = page.getByTestId('modal-invite');
  const inviteText = modal.getByRole('textbox');

  return {inviteText};
};
