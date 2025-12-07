/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {TeamState} from 'Repositories/team/TeamState';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

/**
 * higher order function to check if file sharing is enabled.
 * If not enabled, it will show a warning modal else will return the given callback
 *
 * @param callback - function to be called if file sharing is enabled
 */

export const checkFileSharingPermission = <T extends (...args: any[]) => void>(callback: T): T | (() => void) => {
  const teamState = container.resolve(TeamState);

  if (teamState.isFileSharingSendingEnabled()) {
    return callback;
  }
  return () => {
    showWarningModal(
      t('conversationModalRestrictedFileSharingHeadline'),
      t('conversationModalRestrictedFileSharingDescription'),
    );
  };
};
