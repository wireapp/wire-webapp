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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import VerifiedIcon from 'Components/VerifiedIcon';
import React, {useMemo} from 'react';
import {VerificationMessage as VerificationMessageEntity} from '../../../entity/message/VerificationMessage';
import {VerificationMessageType} from '../../../message/VerificationMessageType';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Declension, joinNames, t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

export interface VerificationMessageProps {
  message: VerificationMessageEntity;
}

const VerificationMessage: React.FC<VerificationMessageProps> = ({message}) => {
  const {userIds, userEntities, unsafeSenderName, verificationMessageType, isSelfClient} = useKoSubscribableChildren(
    message,
    ['userIds', 'userEntities', 'unsafeSenderName', 'verificationMessageType', 'isSelfClient'],
  );

  const nameList = useMemo(() => {
    const namesString = joinNames(userEntities, Declension.NOMINATIVE);
    return capitalizeFirstChar(namesString);
  }, [userEntities]);

  const showDevice = (): void => {
    const topic = isSelfClient ? WebAppEvents.PREFERENCES.MANAGE_DEVICES : WebAppEvents.SHORTCUT.PEOPLE;
    amplify.publish(topic);
  };

  const hasMultipleUsers = userIds?.length > 1;
  const isTypeVerified = verificationMessageType === VerificationMessageType.VERIFIED;
  const isTypeUnverified = verificationMessageType === VerificationMessageType.UNVERIFIED;
  const isTypeNewDevice = verificationMessageType === VerificationMessageType.NEW_DEVICE;
  const isTypeNewMember = verificationMessageType === VerificationMessageType.NEW_MEMBER;

  return (
    <div className="message-header">
      <div className="message-header-icon">
        <VerifiedIcon isVerified={isTypeVerified} />
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-verification"
        data-uie-value={verificationMessageType}
      >
        {isTypeVerified && <span>{t('tooltipConversationAllVerified')}</span>}
        {isTypeUnverified && (
          <>
            <span className="message-header-sender-name">{unsafeSenderName}</span>
            <span className="ellipsis">{t('conversationDeviceUnverified')}</span>
            <span className="message-verification-action accent-text" onClick={showDevice} data-uie-name="go-devices">
              {isSelfClient
                ? t('conversationDeviceYourDevices')
                : t('conversationDeviceUserDevices', userEntities[0]?.name())}
            </span>
          </>
        )}
        {isTypeNewDevice && (
          <>
            <span className="message-header-plain-sender-name">{nameList}</span>
            <span className="ellipsis">
              {hasMultipleUsers ? t('conversationDeviceStartedUsingMany') : t('conversationDeviceStartedUsingOne')}
            </span>
            <span className="message-verification-action accent-text" onClick={showDevice} data-uie-name="go-devices">
              {hasMultipleUsers ? t('conversationDeviceNewDeviceMany') : t('conversationDeviceNewDeviceOne')}
            </span>
          </>
        )}
        {isTypeNewMember && (
          <>
            <span className="ellipsis">{t('conversationDeviceNewPeopleJoined')}</span>
            &nbsp;
            <span className="message-verification-action accent-text" onClick={showDevice} data-uie-name="go-devices">
              {t('conversationDeviceNewPeopleJoinedVerify')}
            </span>
          </>
        )}
        <hr className="message-header-line" />
      </div>
    </div>
  );
};

export default VerificationMessage;
