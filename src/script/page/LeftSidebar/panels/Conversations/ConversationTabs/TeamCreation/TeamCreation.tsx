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

import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ConfirmLeaveModal} from './ConfirmLeaveModal';
import {TeamCreationAccountHeader} from './TeamCreationAccountHeader';
import {TeamCreationBanner} from './TeamCreationBanner';
import {TeamCreationModal} from './TeamCreationModal';

interface Props {
  selfUser: User;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
  isAccountPage?: boolean;
}

export const TeamCreation = ({selfUser, userRepository, teamRepository, isAccountPage = false}: Props) => {
  const [isTeamCreationModalVisible, setIsTeamCreationModalVisible] = useState(false);
  const [isLeaveConfirmModalVisible, setIsLeaveConfirmModalVisible] = useState(false);
  const {name} = useKoSubscribableChildren(selfUser, ['name']);

  const modalCloseHandler = async () => {
    setIsTeamCreationModalVisible(false);
    setIsLeaveConfirmModalVisible(false);

    // updating cache (selfUser and team data)
    await userRepository.getSelf();
    await teamRepository.getTeam();
  };

  const modalOpenHandler = () => {
    setIsTeamCreationModalVisible(true);
  };

  return (
    <>
      {isAccountPage ? (
        <TeamCreationAccountHeader onClick={modalOpenHandler} />
      ) : (
        <TeamCreationBanner onClick={modalOpenHandler} />
      )}
      {isTeamCreationModalVisible && (
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
