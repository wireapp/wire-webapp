/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {InfoToggle} from 'Components/toggle/InfoToggle';
import {t} from 'Util/LocalizerUtil';

import {useCreateConversationModal} from '../hooks/useCreateConversationModal';

export const Preference: React.FC = () => {
  const {
    isGuestsEnabled,
    isReadReceiptsEnabled,
    setIsGuestsEnabled,
    setIsReadReceiptsEnabled,
    isServicesEnabled,
    setIsServicesEnabled,
  } = useCreateConversationModal();

  return (
    <>
      <InfoToggle
        className="modal-style"
        isChecked={isGuestsEnabled}
        setIsChecked={setIsGuestsEnabled}
        isDisabled={false}
        info={t('guestRoomToggleInfoExtended')}
        name={t('guestOptionsTitle')}
        dataUieName="read-receipts"
      />

      <InfoToggle
        dataUieName="read-receipts"
        info={t('servicesRoomToggleInfoExtended')}
        setIsChecked={setIsServicesEnabled}
        isDisabled={false}
        name={t('servicesOptionsTitle')}
        className="modal-style"
        isChecked={isServicesEnabled}
      />
      <InfoToggle
        className="modal-style"
        dataUieName="read-receipts"
        info={t('readReceiptsToggleInfo')}
        isChecked={isReadReceiptsEnabled}
        setIsChecked={setIsReadReceiptsEnabled}
        isDisabled={false}
        name={t('readReceiptsToggleName')}
      />
    </>
  );
};
