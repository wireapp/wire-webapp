/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

export const meetingLinkConfirmationStyles = {
  display: 'flex',
  gap: '8px',
  marginTop: '32px',
  // There is no way to remove padding from modal_text,
  // so we need this negative padding to align the buttons with the modal footer,
  marginBottom: '-50px',
  justifyContent: 'flex-end',
};

export const meetingLinkActionsButtonsStyles = {
  marginBottom: '16px',
};
