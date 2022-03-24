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

import AvailabilityState from 'Components/AvailabilityState';
import React from 'react';
import {Availability} from '@wireapp/protocol-messaging';

import {nameFromType} from '../../../user/AvailabilityMapper';
import {t} from 'Util/LocalizerUtil';
import {AvailabilityContextMenu} from '../../../ui/AvailabilityContextMenu';

interface AvailabilityInputProps {
  availability: Availability.Type;
}

const AvailabilityInput: React.FC<AvailabilityInputProps> = ({availability}) => {
  return (
    <AvailabilityState
      className="preferences-account-availability"
      label={
        availability === Availability.Type.NONE ? t('preferencesAccountAvailabilityUnset') : nameFromType(availability)
      }
      availability={availability}
      showArrow
      dataUieName="status-availability-in-profile"
      onClick={event => {
        AvailabilityContextMenu.show(event.nativeEvent as MouseEvent, 'preferences-account-availability-menu');
      }}
    />
  );
};

export default AvailabilityInput;
