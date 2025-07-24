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

import {UserRepository} from 'Repositories/user/UserRepository';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {AccountInput, useInputDone} from './AccountInput';

interface NameInputProps {
  canEditProfile: boolean;
  name: string;
  userRepository: UserRepository;
}
const logger = getLogger('NameInput');

const NameInput: React.FC<NameInputProps> = ({name, userRepository, canEditProfile}) => {
  const nameInputDone = useInputDone();

  const changeName = async (newName: string): Promise<void> => {
    if (newName === name) {
      nameInputDone.done();
      return;
    }

    if (newName.length) {
      try {
        await userRepository.changeName(newName);
        nameInputDone.done();
      } catch (error) {
        logger.warn('Failed to update name', error);
      }
    }
  };
  return (
    <AccountInput
      isDone={nameInputDone.isDone}
      onValueChange={changeName}
      label={t('preferencesAccountDisplayname')}
      value={name}
      readOnly={!canEditProfile}
      fieldName="displayname"
      maxLength={128}
    />
  );
};

export {NameInput};
