/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {MLSVerified} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {isUser} from 'Util/TypePredicateUtil';

import {MessageIcon, IconInfo} from './E2EIVerificationMessage.styles';

import {Config} from '../../../../Config';
import {Conversation} from '../../../../entity/Conversation';
import {E2EIVerificationMessage as E2EIVerificationMessageEntity} from '../../../../entity/message/E2EIVerificationMessage';
import {E2EIVerificationMessageType} from '../../../../message/E2EIVerificationMessageType';

export interface E2EIVerificationMessageProps {
  message: E2EIVerificationMessageEntity;
  conversation: Conversation;
}

export const E2EIVerificationMessage = ({message, conversation}: E2EIVerificationMessageProps) => {
  const {messageType, userIds} = useKoSubscribableChildren(message, ['messageType', 'userIds']);
  const {participating_user_ets: participatingUserEts} = useKoSubscribableChildren(conversation, [
    'participating_user_ets',
  ]);

  const degradedUsers = userIds
    ?.map(qualifiedId => participatingUserEts?.find(user => user.id === qualifiedId.id))
    .filter(isUser);

  const usersName = degradedUsers?.map(user => user.name()).join(', ');

  const isVerified = messageType === E2EIVerificationMessageType.VERIFIED;
  const isUnverified = messageType === E2EIVerificationMessageType.UNVERIFIED;
  const isExpired = messageType === E2EIVerificationMessageType.EXPIRED;
  const isNewDevice = messageType === E2EIVerificationMessageType.NEW_DEVICE;
  const isNewMember = messageType === E2EIVerificationMessageType.NEW_MEMBER;
  const isDegraded = messageType === E2EIVerificationMessageType.DEGRADED;

  const learnMoreReplacement = replaceLink(Config.getConfig().URL.SUPPORT.E2EI_VERIFICATION);

  return (
    <div className="message-header">
      <div css={MessageIcon}>
        {isVerified ? (
          <MLSVerified data-uie-name="conversation-title-bar-verified-icon" />
        ) : (
          <Icon.Info css={IconInfo} />
        )}
      </div>

      <div
        className="message-header-label message-header-label--verification"
        data-uie-name="element-message-verification"
        data-uie-value={messageType}
      >
        {isVerified && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('tooltipConversationAllE2EIVerified', {}, learnMoreReplacement),
            }}
          />
        )}

        {isExpired && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('tooltipConversationAllE2EICertificateExpired', {user: usersName}),
            }}
          />
        )}

        {isNewDevice && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('tooltipConversationAllE2EINewDeviceAdded', {user: usersName}),
            }}
          />
        )}

        {isNewMember && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('tooltipConversationAllE2EINewUserAdded', {user: usersName}),
            }}
          />
        )}

        {isUnverified && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('tooltipConversationAllE2EINewUserAdded', {user: usersName}),
            }}
          />
        )}

        {isDegraded && (
          <span
            dangerouslySetInnerHTML={{
              __html: t('tooltipConversationAllE2EICertificateRevoked', {user: usersName}, learnMoreReplacement),
            }}
          />
        )}
      </div>
    </div>
  );
};
