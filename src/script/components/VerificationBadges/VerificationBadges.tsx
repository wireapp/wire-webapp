/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {CSSProperties, useEffect} from 'react';

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {E2eiConversationState} from '@wireapp/core/lib/messagingProtocols/mls';
import {container} from 'tsyringe';

import {
  CertificateExpiredIcon,
  ExpiresSoon,
  CertificateRevoked,
  MLSVerified,
  ProteusVerified,
} from '@wireapp/react-ui-kit';

import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {Conversation} from 'src/script/entity/Conversation';
import {Core} from 'src/script/service/CoreSingleton';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {base64ToArray} from 'Util/util';

export enum MLSStatuses {
  VALID = 'valid',
  NOT_DOWNLOADED = 'not_downloaded',
  EXPIRED = 'expired',
  EXPIRES_SOON = 'expires_soon',
}

interface VerificationBadgesProps {
  conversationProtocol?: ConversationProtocol;
  isMLSVerified?: boolean;
  isProteusVerified?: boolean;
  MLSStatus?: MLSStatuses;
  displayTitle?: boolean;
}

const badgeWrapper: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const iconStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const title = (isMLSConversation = false): CSSProperties => ({
  color: isMLSConversation ? 'var(--green-500)' : 'var(--blue-500)',
  fontSize: '12px',
  lineHeight: '14px',
  marginRight: '4px',
});

const useVerificationState = (conversation: Conversation, core = container.resolve(Core)) => {
  const [MLSVerificationState, setMLSVerificationState] = React.useState<MLSStatuses | undefined>();
  const {verification_state: proteusVerificationState} = useKoSubscribableChildren(conversation, [
    'verification_state',
  ]);

  useEffect(() => {
    if (!conversation.groupId) {
      return;
    }

    core.service?.e2eIdentity?.getConversationState(base64ToArray(conversation.groupId)).then(state => {
      setMLSVerificationState(state === E2eiConversationState.Verified ? MLSStatuses.VALID : undefined);
    });
  });

  return {MLS: MLSVerificationState, proteus: proteusVerificationState};
};

type ConversationVerificationBadgeProps = {
  conversation: Conversation;
};
export const ConversationVerificationBadges = ({conversation}: ConversationVerificationBadgeProps) => {
  const verificationState = useVerificationState(conversation);
  return (
    <VerificationBadges
      conversationProtocol={conversation.protocol}
      MLSStatus={verificationState.MLS}
      isProteusVerified={verificationState.proteus === ConversationVerificationState.VERIFIED}
    />
  );
};

export const VerificationBadges: React.FC<VerificationBadgesProps> = ({
  conversationProtocol,
  isMLSVerified = false,
  isProteusVerified = false,
  MLSStatus,
  displayTitle = false,
}) => {
  if (!isMLSVerified && !isProteusVerified) {
    return null;
  }

  const isExpired = MLSStatus === MLSStatuses.EXPIRED;
  const isNotDownloaded = MLSStatus === MLSStatuses.NOT_DOWNLOADED;
  const isExpiresSoon = MLSStatus === MLSStatuses.EXPIRES_SOON;

  const conversationHasProtocol = !!conversationProtocol;

  const showMLSBadge = conversationHasProtocol
    ? conversationProtocol === ConversationProtocol.MLS && isMLSVerified
    : isMLSVerified;

  const showProteusBadge = conversationHasProtocol
    ? conversationProtocol === ConversationProtocol.PROTEUS && isProteusVerified
    : isProteusVerified;

  return (
    <div className="conversation-badges" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      {showMLSBadge && (
        <div style={badgeWrapper}>
          {displayTitle && <span style={title(true)}>{t('E2EI.verified')}</span>}

          {!isExpired && !isNotDownloaded && !isExpiresSoon && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip={t('E2EI.deviceVerified')}
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatuses.VALID}
            >
              <MLSVerified data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isExpired && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip={t('E2EI.certificateExpired')}
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatuses.EXPIRED}
            >
              <CertificateExpiredIcon data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isExpiresSoon && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip={t('E2EI.certificateExpiresSoon')}
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatuses.EXPIRES_SOON}
            >
              <ExpiresSoon data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isNotDownloaded && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip={t('E2EI.certificateRevoked')}
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatuses.NOT_DOWNLOADED}
            >
              <CertificateRevoked data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}
        </div>
      )}

      {showProteusBadge && (
        <div style={badgeWrapper}>
          {displayTitle && <span style={title(false)}>{t('proteusVerifiedDetails')}</span>}

          <span
            className="with-tooltip with-tooltip--external"
            data-tooltip={t('proteusDeviceVerified')}
            style={iconStyles}
            data-uie-name="proteus-verified"
          >
            <ProteusVerified data-uie-name="conversation-title-bar-verified-icon" />
          </span>
        </div>
      )}
    </div>
  );
};
