/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useState} from 'react';

import {User} from 'Repositories/entity/User';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {UserRepository} from 'Repositories/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ConfirmLeaveModal} from './ConfirmLeaveModal';
import {TeamCreationModal} from './TeamCreationModal';
import {useTeamCreationModal} from './useTeamCreationModal';

interface Props {
  selfUser: User;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
}

export const TeamCreationModalContainer = ({selfUser, userRepository, teamRepository}: Props) => {
  const {isModalOpen, hideModal} = useTeamCreationModal();
  const [isLeaveConfirmModalVisible, setIsLeaveConfirmModalVisible] = useState(false);
  const {name} = useKoSubscribableChildren(selfUser, ['name']);

  const modalCloseHandler = async () => {
    hideModal();
    setIsLeaveConfirmModalVisible(false);

    // updating cache (selfUser and team data)
    await userRepository.getSelf();
    await teamRepository.getTeam();
  };

  return (
    <>
      {isModalOpen && (
        <TeamCreationModal
          userName={name}
          onSuccess={modalCloseHandler}
          onClose={() => setIsLeaveConfirmModalVisible(true)}
        />
      )}
      <ConfirmLeaveModal
        isShown={isLeaveConfirmModalVisible}
        onClose={() => setIsLeaveConfirmModalVisible(false)}
        onLeave={modalCloseHandler}
      />
    </>
  );
};
