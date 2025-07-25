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
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

interface ServicesOptionsProps {
  activeConversation: Conversation;
  toggleAccessState: (accessType: number, text: string, hasService: boolean) => void;
  isToggleDisabled?: boolean;
}

const ServicesOptions: FC<ServicesOptionsProps> = ({
  activeConversation,
  toggleAccessState,
  isToggleDisabled = false,
}) => {
  const {hasService, isServicesRoom, isGuestAndServicesRoom} = useKoSubscribableChildren(activeConversation, [
    'hasService',
    'isServicesRoom',
    'isGuestAndServicesRoom',
  ]);

  const isServicesEnabled = isServicesRoom || isGuestAndServicesRoom;

  const toggleServicesAccessState = () => {
    toggleAccessState(ACCESS_TYPES.SERVICE, t('modalConversationRemoveServicesMessage'), hasService);
  };

  return (
    <div className="guest-options__content">
      <BaseToggle
        isChecked={isServicesEnabled}
        setIsChecked={toggleServicesAccessState}
        isDisabled={isToggleDisabled}
        infoText={t('servicesRoomToggleInfo')}
        toggleName={t('servicesOptionsTitle')}
        toggleId="services"
      />
    </div>
  );
};

export {ServicesOptions};
