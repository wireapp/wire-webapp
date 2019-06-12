/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import {WebAppEvents} from '../event/WebApp';
import {TeamRepository} from '../team/TeamRepository';
import {UserRepository} from '../user/UserRepository';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {noop} from './util';

let userRepository: UserRepository;
let teamRepository: TeamRepository;

export const initLegalHold = (newUserRepository: UserRepository, newTeamRepository: TeamRepository) => {
  userRepository = newUserRepository;
  teamRepository = newTeamRepository;
};

export const showRequestModal = async (fingerprint: string) => {
  const selfUser = userRepository.self();

  if (!selfUser.inTeam()) {
    return;
  }

  amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.INPUT, {
    preventClose: true,
    primaryAction: {
      action: async (password: string) => {
        await teamRepository.teamService.sendLegalHoldApproval(selfUser.teamId, selfUser.id, password);
        // TODO: check response and show error message if needed
      },
      text: 'Accept',
    },
    secondaryAction: {
      action: noop,
      text: 'Not now',
    },
    text: {
      htmlMessage: `
      All future messages will be recorded by the device with fingerprint:<br>
      ${fingerprint}<br>
      This includes deleted, edited, and timed messages in all conversations.<br>
      Enter your password to confirm.
      `,
      title: 'Legal hold requested',
    },
  });
};
