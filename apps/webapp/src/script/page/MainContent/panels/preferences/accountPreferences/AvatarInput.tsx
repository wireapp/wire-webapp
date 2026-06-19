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

import {useState, useRef} from 'react';

import cx from 'classnames';

import {TabIndex} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {User} from 'Repositories/entity/User';
import {UserRepository} from 'Repositories/user/userRepository';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {handleKeyDown, KEY} from 'Util/keyboardUtil';
import {getLogger} from 'Util/logger';
import {isErrorWithType} from 'Util/typePredicateUtil';
import {formatBytes, validateProfileImageResolution} from 'Util/util';

import {FileInput} from './FileInput';

import {Config} from '../../../../../Config';
import {UserError} from '../../../../../error/userError';

interface AvatarInputProps {
  isActivatedAccount: boolean;
  selfUser: User;
  userRepository: UserRepository;
  hideAvailabilityStatus?: boolean;
}

const FILE_TYPES = ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'];
const logger = getLogger('AvatarInput');

export const AvatarInput = ({
  selfUser,
  isActivatedAccount,
  userRepository,
  hideAvailabilityStatus = false,
}: AvatarInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const {translate} = useApplicationContext();

  if (!isActivatedAccount) {
    return <Avatar participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />;
  }

  const showUploadWarning = (title: string, message: string): Promise<never> => {
    const modalOptions = {text: {message, title}};
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, modalOptions, undefined, translate);
    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  };

  const setPicture = async (newUserPicture: File): Promise<boolean | User> => {
    const isTooLarge = newUserPicture.size > Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE;
    if (isTooLarge) {
      const maximumSizeInMB = Number.parseFloat(formatBytes(Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE));
      const messageString = translate('modalPictureTooLargeMessage', {number: maximumSizeInMB});
      const titleString = translate('modalPictureTooLargeHeadline');

      return showUploadWarning(titleString, messageString);
    }

    const isWrongFormat = !FILE_TYPES.includes(newUserPicture.type);
    if (isWrongFormat) {
      const titleString = translate('modalPictureFileFormatHeadline');
      const messageString = translate('modalPictureFileFormatMessage');

      return showUploadWarning(titleString, messageString);
    }

    setIsUploading(true);

    const minHeight = UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.HEIGHT;
    const minWidth = UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.WIDTH;

    try {
      const isValid = await validateProfileImageResolution(newUserPicture, minWidth, minHeight);
      if (isValid) {
        return await userRepository.changePicture(newUserPicture);
      }

      const messageString = translate('modalPictureTooSmallMessage');
      const titleString = translate('modalPictureTooSmallHeadline');
      return await showUploadWarning(titleString, messageString);
    } catch (error: unknown) {
      logger.error('Failed to validate profile image', error);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const inputClick = () => {
    inputRef.current?.click();
  };

  const onFileInputChange = (files: FileList) => {
    if (isUploading) {
      return;
    }
    const newUserPicture = files.item(0);
    if (newUserPicture) {
      setPicture(newUserPicture).catch((error: unknown) => {
        const isInvalidUpdate = isErrorWithType(error) && error.type === UserError.TYPE.INVALID_UPDATE;
        if (!isInvalidUpdate) {
          throw error;
        }
      });
    }
  };

  return (
    <div
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) =>
        handleKeyDown({
          event,
          callback: inputClick,
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      aria-label={`${translate('tooltipPreferencesPicture')}`}
    >
      <label
        className={cx('preferences-account-picture-button', {loading: isUploading})}
        htmlFor="self-upload-file-input"
        title={translate('tooltipPreferencesPicture')}
      >
        <Avatar
          className="see-through"
          participant={selfUser}
          avatarSize={AVATAR_SIZE.X_LARGE}
          avatarAlt={translate('selfProfileImageAlt')}
          hideAvailabilityStatus={hideAvailabilityStatus}
        />

        <FileInput
          disabled={isUploading}
          ref={inputRef}
          id="self-upload-file-input"
          data-uie-name="do-select-picture"
          fileTypes={FILE_TYPES}
          tabIndex={TabIndex.UNFOCUSABLE}
          onFileChange={onFileInputChange}
        />
        <span className="icon-camera" />
      </label>
    </div>
  );
};
