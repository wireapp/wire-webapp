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

import {LegalHoldMemberStatus} from '@wireapp/api-client/dist/commonjs/team/legalhold/';
import {amplify} from 'amplify';
import {WebAppEvents} from '../event/WebApp';
import {TeamRepository} from '../team/TeamRepository';
import {UserRepository} from '../user/UserRepository';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {t} from './LocalizerUtil';
import {noop} from './util';

let userRepository: UserRepository;
let teamRepository: TeamRepository;

export const initLegalHold = (newUserRepository: UserRepository, newTeamRepository: TeamRepository) => {
  userRepository = newUserRepository;
  teamRepository = newTeamRepository;
};

export const getFingerprint = () => {
  return '00';
};

export const showRequestModal = async (fingerprint?: string) => {
  const selfUser = userRepository.self();
  if (!selfUser.inTeam()) {
    return;
  }
  if (typeof fingerprint === 'undefined') {
    const state = await teamRepository.teamService.getLegalHoldState(selfUser.teamId, selfUser.id);
    if (state === LegalHoldMemberStatus.PENDING) {
      selfUser.hasPendingLegalHold(true);
      // TODO: wait for backend to properly return fingerprint
      fingerprint = '00';
    } else {
      return;
    }
  }
  amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.INPUT, {
    preventClose: true,
    primaryAction: {
      action: async (password: string) => {
        const selfUser = userRepository.self();
        await teamRepository.teamService.sendLegalHoldApproval(selfUser.teamId, selfUser.id, password);
        // TODO: check response and show error message if needed
      },
      text: t('legalHoldModalPrimaryAction'),
    },
    secondaryAction: {
      action: noop,
      text: t('legalHoldModalSecondaryAction'),
    },
    text: {
      htmlMessage: t(
        'legalHoldModalText',
        {},
        {br: '<br>', fingerprint: `<span data-uie-name="status-modal-fingerprint">${fingerprint}</span>`}
      ),
      title: t('legalHoldModalTitle'),
    },
  });
};
