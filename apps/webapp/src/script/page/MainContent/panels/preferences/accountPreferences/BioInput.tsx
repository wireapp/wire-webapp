/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {type AccountLink} from '@wireapp/api-client/lib/user';

import {UserRepository} from 'Repositories/user/userRepository';
import {t} from 'Util/localizerUtil';

import {AccountInput, useInputDone} from './AccountInput';

const MAX_BIO_LENGTH = 140;

interface BioInputProps {
  bio: string;
  currentLinks: AccountLink[];
  onBioSaved: (bio: string) => void;
  userRepository: UserRepository;
}

const BioInput = ({bio, currentLinks, onBioSaved, userRepository}: BioInputProps) => {
  const bioInputDone = useInputDone();

  const changeBio = async (newBio: string): Promise<void> => {
    if (newBio === bio) {
      bioInputDone.done();
      return;
    }

    await userRepository.changeBio(newBio, currentLinks);
    onBioSaved(newBio);
    bioInputDone.done();
  };

  return (
    <AccountInput
      label={t('preferencesAccountBio')}
      value={bio}
      onValueChange={changeBio}
      isDone={bioInputDone.isDone}
      maxLength={MAX_BIO_LENGTH}
      containerWidth={480}
      fieldName="bio"
    />
  );
};

export {BioInput};
