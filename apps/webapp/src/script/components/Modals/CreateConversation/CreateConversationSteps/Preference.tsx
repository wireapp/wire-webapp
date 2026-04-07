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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {container} from 'tsyringe';

import {AppsDisabledNote} from 'Components/Note/AppsDisabledNote/AppsDisabledNote';
import {InfoToggle} from 'Components/toggle/InfoToggle';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {t} from 'Util/localizerUtil';

import {useCreateConversationModal} from '../hooks/useCreateConversationModal';

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
  } = useCreateConversationModal();

  const teamState = container.resolve(TeamState);

  const {
    isCellsEnabled: isCellsEnabledForTeam,
    isMLSEnabled,
    isAppsEnabled,
    hasWhitelistedServices,
  } = useKoSubscribableChildren(teamState, [
    'isCellsEnabled',
    'isMLSEnabled',
    'isAppsEnabled',
    'hasWhitelistedServices',
  ]);
  const isCellsEnabledForEnvironment = Config.getConfig().FEATURE.ENABLE_CELLS;
  const isCellsOptionEnabled = isCellsEnabledForEnvironment && isCellsEnabledForTeam;

  const defaultProtocol = isMLSEnabled
    ? teamState.teamFeatures()?.mls?.config.defaultProtocol
    : CONVERSATION_PROTOCOL.PROTEUS;

  // Read receipts are temorarily disabled for MLS groups and channels until it is supported
  const areReadReceiptsEnabled = defaultProtocol !== CONVERSATION_PROTOCOL.MLS;

  const isAppsFeatureAvailable =
    (defaultProtocol === CONVERSATION_PROTOCOL.MLS && isAppsEnabled) ||
    (defaultProtocol === CONVERSATION_PROTOCOL.PROTEUS && hasWhitelistedServices);

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
        className="modal-style"
        dataUieName="info-toggle-services"
        info={t('servicesRoomToggleInfoExtended')}
        setIsChecked={setIsServicesEnabled}
        isDisabled={!isAppsFeatureAvailable}
        name={t('servicesOptionsTitle')}
        isChecked={isServicesEnabled && isAppsFeatureAvailable}
        label={!isAppsFeatureAvailable && <AppsDisabledNote />}
      />

      {areReadReceiptsEnabled && (
        <InfoToggle
          className="modal-style"
          dataUieName="read-receipts"
          info={t('readReceiptsToggleInfo')}
          isChecked={isReadReceiptsEnabled}
          setIsChecked={setIsReadReceiptsEnabled}
          isDisabled={false}
          name={t('readReceiptsToggleName')}
        />
      )}

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
