/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC} from 'react';

import {BaseToggle} from 'Components/toggle/BaseToggle';
import {ACCESS_TYPES} from 'Repositories/conversation/ConversationAccessPermission';
import {Conversation} from 'Repositories/entity/Conversation';
import {TeamState} from 'Repositories/team/TeamState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {checkAppsFeatureAvailability} from 'Util/featureUtil';

import {serviceOptionContainer} from './serviceOptions.styles';

interface ServicesOptionsProps {
  activeConversation: Conversation;
  toggleAccessState: (accessType: number, text: string, hasService: boolean) => void;
  isToggleDisabled?: boolean;
  teamState: TeamState;
}

const ServicesOptions: FC<ServicesOptionsProps> = ({
  activeConversation,
  toggleAccessState,
  isToggleDisabled = false,
  teamState,
}) => {
  const {translate} = useApplicationContext();
  const {hasService, isServicesRoom, isGuestAndServicesRoom} = useKoSubscribableChildren(activeConversation, [
    'hasService',
    'isServicesRoom',
    'isGuestAndServicesRoom',
  ]);

  const {isAppsEnabled} = useKoSubscribableChildren(teamState, ['isAppsEnabled']);

  const isServicesEnabled = isServicesRoom || isGuestAndServicesRoom;

  const isAppsFeatureEnabled = checkAppsFeatureAvailability({
    protocol: activeConversation.protocol,
    isAppsEnabled: isAppsEnabled,
  });

  const displayAppsToggle = isAppsFeatureEnabled || isServicesEnabled;

  const toggleServicesAccessState = () => {
    toggleAccessState(ACCESS_TYPES.SERVICE, translate('modalConversationRemoveServicesMessage'), hasService);
  };

  return (
    <div css={serviceOptionContainer}>
      {displayAppsToggle ? (
        <BaseToggle
          isChecked={isServicesEnabled}
          setIsChecked={toggleServicesAccessState}
          isDisabled={isToggleDisabled}
          infoText={translate('servicesRoomToggleInfo')}
          toggleName={translate('servicesOptionsTitle')}
          toggleId="services"
        />
      ) : (
        <>
          <h4>{translate('servicesNotEnabledNoteTitle')}</h4>
          <p>{translate('servicesNotEnabledBody')}</p>
        </>
      )}
    </div>
  );
};

export {ServicesOptions};
