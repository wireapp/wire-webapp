/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {FC} from 'react';

import {FadingScrollbar} from 'Components/fadingscrollbar';
import {UserDevices, UserDevicesState} from 'Components/userDevices';
import {useUserDevicesHistory} from 'Hooks/useuserdeviceshistory';
import type {User} from 'Repositories/entity/user';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {ViewModelRepositories} from '../../../viewModel/mainviewmodel';
import {PanelHeader} from '../panelheader';

interface ParticipantDevicesProps {
  onClose: () => void;
  onGoBack: (userEntity: User) => void;
  groupId?: string;
  repositories: ViewModelRepositories;
  user: User;
}

const ParticipantDevices: FC<ParticipantDevicesProps> = ({repositories, onClose, onGoBack, groupId, user}) => {
  const {translate} = useApplicationContext();
  const history = useUserDevicesHistory();

  return (
    <div id="participant-devices" className="panel__page participant-devices">
      <h2 className="visually-hidden">{translate('conversationDetailsActionDevices')}</h2>

      <PanelHeader
        onGoBack={() => {
          if (history.current.state === UserDevicesState.DEVICE_LIST) {
            return onGoBack(user);
          }

          history.goBack();
        }}
        onClose={onClose}
        title={history.current.headline}
        goBackTitle={translate('groupParticipantActionDevicesGoBack')}
        goBackUie="go-back-participant-devices"
      />

      <FadingScrollbar className="panel__content">
        <UserDevices
          groupId={groupId}
          clientRepository={repositories.client}
          cryptographyRepository={repositories.cryptography}
          messageRepository={repositories.message}
          current={history.current}
          goTo={history.goTo}
          user={user}
        />
      </FadingScrollbar>
    </div>
  );
};

export {ParticipantDevices};
