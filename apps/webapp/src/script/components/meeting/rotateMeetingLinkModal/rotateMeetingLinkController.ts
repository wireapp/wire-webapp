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

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';

let openHandler: ((meetingId: QualifiedId) => void) | undefined;

export const registerRotateMeetingLinkHandler = (handler: (meetingId: QualifiedId) => void): void => {
  openHandler = handler;
};

export const openRotateMeetingLink = (meetingId: QualifiedId): void => {
  if (openHandler === undefined) {
    throw new Error('Rotate meeting link modal has not been initialized');
  }
  openHandler(meetingId);
};
