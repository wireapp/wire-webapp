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

import UserDetails from 'Components/panel/UserDetails';
import EnrichedFields from 'Components/panel/EnrichedFields';
import Icon from 'Components/Icon';

import {t} from 'Util/LocalizerUtil';

import {User} from '../../../../../entity/User';

interface UserConversationDetailsProps {
  firstParticipant: User;
  onDevicesClick: () => void;
  badge?: string;
  classifiedDomains?: string[];
  isVerified?: boolean;
  isSelfVerified?: boolean;
  isFederated?: boolean;
}

const UserConversationDetails: FC<UserConversationDetailsProps> = ({
  firstParticipant,
  onDevicesClick,
  isVerified = false,
  isSelfVerified = false,
  isFederated = false,
  badge = '',
  classifiedDomains,
}) => {
  return (
    <>
      <UserDetails
        participant={firstParticipant}
        isVerified={isVerified}
        isSelfVerified={isSelfVerified}
        badge={badge}
        classifiedDomains={classifiedDomains}
      />

      <EnrichedFields user={firstParticipant} showDomain={isFederated} />

      {(firstParticipant.isConnected || firstParticipant.inTeam) && (
        <div className="conversation-details__devices">
          <button className="panel__action-item" onClick={onDevicesClick} data-uie-name="go-devices" type="button">
            <span className="panel__action-item__icon">
              <Icon.Devices />
            </span>

            <span className="panel__action-item__text">{t('conversationDetailsActionDevices')}</span>

            <Icon.ChevronRight className="chevron-right-icon" />
          </button>
        </div>
      )}
    </>
  );
};

export default UserConversationDetails;
