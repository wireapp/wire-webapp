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

import {useState, type FunctionComponent} from 'react';

import {ConfirmLeaveModal} from './confirmLeaveModal';
import {TeamCreationModal} from './teamCreationModal';
import {useTeamCreationModal} from './useTeamCreationModal';

import {User} from '../../../../../../repositories/entity/User';
import {TeamRepository} from '../../../../../../repositories/team/TeamRepository';
import {UserRepository} from '../../../../../../repositories/user/userRepository';
import {useKoSubscribableChildren} from '../../../../../../util/componentUtil';

interface Props {
  selfUser: User;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
}

export const TeamCreationModalContainer: FunctionComponent<Props> = ({
  selfUser,
  userRepository,
  teamRepository,
}: Props) => {
  const {isModalOpen, hideModal} = useTeamCreationModal();
  const [isLeaveConfirmModalVisible, setIsLeaveConfirmModalVisible] = useState(false);
  const {name} = useKoSubscribableChildren(selfUser, ['name']);

  const modalCloseHandler = async (): Promise<void> => {
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
          onClose={() => {
            return setIsLeaveConfirmModalVisible(true);
          }}
        />
      )}
      <ConfirmLeaveModal
        isShown={isLeaveConfirmModalVisible}
        onClose={() => {
          return setIsLeaveConfirmModalVisible(false);
        }}
        onLeave={modalCloseHandler}
      />
    </>
  );
};
