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

import {container} from 'tsyringe';

import {InfoToggle} from 'Components/toggle/InfoToggle';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {useCreateConversationModal} from '../hooks/useCreateConversationModal';
import {ConversationType} from '../types';

export const Preference = () => {
  const {
    isCellsEnabled,
    isGuestsEnabled,
    isReadReceiptsEnabled,
    setIsCellsEnabled,
    setIsGuestsEnabled,
    setIsReadReceiptsEnabled,
    isServicesEnabled,
    setIsServicesEnabled,
    conversationType,
  } = useCreateConversationModal();

  const teamState = container.resolve(TeamState);

  const {isCellsEnabled: isCellsEnabledForTeam} = useKoSubscribableChildren(teamState, ['isCellsEnabled']);
  const isCellsEnabledForEnvironment = Config.getConfig().FEATURE.ENABLE_CELLS;
  const isCellsOptionEnabled = isCellsEnabledForEnvironment && isCellsEnabledForTeam;

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

      {conversationType === ConversationType.Group && (
        <InfoToggle
          className="modal-style"
          dataUieName="services"
          info={t('servicesRoomToggleInfoExtended')}
          setIsChecked={setIsServicesEnabled}
          isDisabled={false}
          name={t('servicesOptionsTitle')}
          isChecked={isServicesEnabled}
        />
      )}

      <InfoToggle
        className="modal-style"
        dataUieName="read-receipts"
        info={t('readReceiptsToggleInfo')}
        isChecked={isReadReceiptsEnabled}
        setIsChecked={setIsReadReceiptsEnabled}
        // Temporarily disabled read receipts toggle for channels
        // until it is supported by MLS
        isDisabled={conversationType === ConversationType.Channel}
        name={t('readReceiptsToggleName')}
      />

      {isCellsOptionEnabled && (
        <InfoToggle
          className="modal-style"
          dataUieName="cells"
          isChecked={isCellsEnabled}
          setIsChecked={setIsCellsEnabled}
          isDisabled={false}
          name={t('modalCreateGroupCellsToggleHeading')}
          info={t('modalCreateGroupCellsToggleInfo')}
        />
      )}
    </>
  );
};
