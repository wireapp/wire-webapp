import React from 'react';
import {container} from 'tsyringe';
import {Availability} from '@wireapp/protocol-messaging';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {t} from 'Util/LocalizerUtil';

import type {UserRepository} from '../../user/UserRepository';
import {UserState} from '../../user/UserState';
import AccentColorPicker from '../AccentColorPicker';
import AvailabilityState from 'Components/AvailabilityState';
import {nameFromType} from '../../user/AvailabilityMapper';
import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import AccountInput from './accountPreferences/AccountInput';

interface AccountPreferencesProps {
  userRepository: UserRepository;
  userState: UserState;
}

const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  userRepository,
  userState = container.resolve(UserState),
}) => {
  const {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {name, email, availability, username} = useKoSubscribableChildren(selfUser, [
    'name',
    'email',
    'availability',
    'username',
  ]);
  return (
    <div>
      {name}
      <Avatar participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />
      <div onClick={event => AvailabilityContextMenu.show(event.nativeEvent, 'preferences-account-availability-menu')}>
        <AvailabilityState
          label={
            availability === Availability.Type.NONE
              ? t('preferencesAccountAvailabilityUnset')
              : nameFromType(availability)
          }
          availability={availability}
          showArrow
          dataUieName="status-availability-in-profile"
        />
      </div>
      <AccentColorPicker user={selfUser} doSetAccentColor={id => userRepository.changeAccentColor(id)} />
      <div>{'Info'}</div>
      <AccountInput label="Displayname" value={name} />
      <AccountInput label="Username" value={username} />
    </div>
  );
};

export default AccountPreferences;
