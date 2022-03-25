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
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {User} from '../../../entity/User';
import {t} from 'Util/LocalizerUtil';
import FileInput from './FileInput';
import {UserError} from '../../../error/UserError';
import {Config} from '../../../Config';
import {UserRepository} from '../../../user/UserRepository';
import {validateProfileImageResolution} from 'Util/util';
import {getLogger} from 'Util/Logger';
import {modals, ModalsViewModel} from '../../../view_model/ModalsViewModel';
import {handleKeyDown} from 'Util/KeyboardUtil';

interface AvatarInputProps {
  isActivatedAccount: boolean;
  selfUser: User;
  userRepository: UserRepository;
}

const FILE_TYPES = ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'];
const logger = getLogger('AvatarInput');

const AvatarInput: React.FC<AvatarInputProps> = ({selfUser, isActivatedAccount, userRepository}) => {
  const inputRef = React.useRef(null);

  if (!isActivatedAccount) {
    return <Avatar participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />;
  }

  const showUploadWarning = (title: string, message: string): Promise<never> => {
    const modalOptions = {text: {message, title}};
    modals.showModal(ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions, undefined);
    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  };

  const setPicture = async (newUserPicture: File): Promise<boolean | User> => {
    const isTooLarge = newUserPicture.size > Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE;
    if (isTooLarge) {
      const maximumSizeInMB = Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
      const messageString = t('modalPictureTooLargeMessage', maximumSizeInMB);
      const titleString = t('modalPictureTooLargeHeadline');

      return showUploadWarning(titleString, messageString);
    }

    const isWrongFormat = !FILE_TYPES.includes(newUserPicture.type);
    if (isWrongFormat) {
      const titleString = t('modalPictureFileFormatHeadline');
      const messageString = t('modalPictureFileFormatMessage');

      return showUploadWarning(titleString, messageString);
    }

    const minHeight = UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.HEIGHT;
    const minWidth = UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.WIDTH;

    try {
      const isValid = await validateProfileImageResolution(newUserPicture, minWidth, minHeight);
      if (isValid) {
        return await userRepository.changePicture(newUserPicture);
      }

      const messageString = t('modalPictureTooSmallMessage');
      const titleString = t('modalPictureTooSmallHeadline');
      return await showUploadWarning(titleString, messageString);
    } catch (error) {
      logger.error('Failed to validate profile image', error);
      return false;
    }
  };

  const inputClick = () => {
    inputRef.current.click();
  };

  return (
    <div
      tabIndex={0}
      role="button"
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(event, inputClick)}
      aria-label={t('tooltipPreferencesPicture')}
    >
      <label
        className="preferences-account-picture-button"
        htmlFor="self-upload-file-input"
        title={t('tooltipPreferencesPicture')}
      >
        <Avatar className="see-through" participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />
        <FileInput
          ref={inputRef}
          id="self-upload-file-input"
          data-uie-name="do-select-picture"
          fileTypes={FILE_TYPES}
          tabIndex={-1}
          onFileChange={files => {
            const newUserPicture = files.item(0);

            setPicture(newUserPicture).catch(error => {
              const isInvalidUpdate = error.type === UserError.TYPE.INVALID_UPDATE;
              if (!isInvalidUpdate) {
                throw error;
              }
            });
          }}
        />
        <span className="icon-camera" />
      </label>
    </div>
  );
};

export default AvatarInput;
