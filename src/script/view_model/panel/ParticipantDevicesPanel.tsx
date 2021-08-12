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

import React from 'react';

import {registerReactComponent} from 'Util/ComponentUtil';
import useEffectRef from 'Util/useEffectRef';
import UserDevices, {UserDevicesState, useUserDevicesHistory} from 'Components/UserDevices';

import type {User} from '../../entity/User';
import {ViewModelRepositories} from '../MainViewModel';
import PanelHeader from './PanelHeader';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';

interface ParticipantDevicesPanelProps {
  onClose: () => void;
  onGoBack: () => void;
  repositories: ViewModelRepositories;
  user: User;
}

const ParticipantDevicesPanel: React.FC<ParticipantDevicesPanelProps> = ({repositories, onClose, onGoBack, user}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);
  const history = useUserDevicesHistory();
  return (
    <>
      <PanelHeader
        onGoBack={() => {
          if (history.current.state === UserDevicesState.DEVICE_LIST) {
            return onGoBack();
          }
          history.goBack();
        }}
        onClose={onClose}
        title={history.current.headline}
        goBackUie="go-back-participant-devices"
      />

      <div className="panel__content" ref={setScrollbarRef}>
        <UserDevices
          clientRepository={repositories.client}
          cryptographyRepository={repositories.cryptography}
          messageRepository={repositories.message}
          current={history.current}
          goTo={history.goTo}
          user={user}
        />
      </div>
    </>
  );
};

export default ParticipantDevicesPanel;

registerReactComponent('participant-devices-panel', {
  component: ParticipantDevicesPanel,
  template: '<div data-bind="react: {onClose, onGoBack, repositories, user}"></div>',
});
