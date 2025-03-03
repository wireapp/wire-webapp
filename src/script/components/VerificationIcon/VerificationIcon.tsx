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

import {VerifiedIcon, NotVerifiedIcon} from '../Icon';

export interface VerificationIconProps {
  className?: string;
  dataUieName?: string;
  isVerified: boolean;
}

export const VerificationIcon = ({isVerified, dataUieName, className}: VerificationIconProps) => {
  return isVerified ? (
    <VerifiedIcon className={className ?? 'verified-icon'} data-uie-name={dataUieName ?? 'user-device-verified'} />
  ) : (
    <NotVerifiedIcon
      className={className ?? 'not-verified-icon'}
      data-uie-name={dataUieName ?? 'user-device-not-verified'}
    />
  );
};
