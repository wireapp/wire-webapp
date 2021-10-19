import React from 'react';
import type {UserRepository} from 'src/script/user/UserRepository';
import {UserState} from 'src/script/user/UserState';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import AccentColorPicker from '../AccentColorPicker';

interface AccountPreferencesProps {
  userRepository: UserRepository;
  userState: UserState;
}

const StyledInput = () => {
  return (
    <div>
      <label></label>
    </div>
  );
};

const AccountPreferences: React.FC<AccountPreferencesProps> = ({
  userRepository,
  userState = container.resolve(UserState),
}) => {
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  return (
    <div>
      {'name'}
      {'picture'}
      {'colorpicker'}
      <AccentColorPicker user={selfUser} doSetAccentColor={id => userRepository.changeAccentColor(id)} />
      <StyledInput />
    </div>
  );
};
