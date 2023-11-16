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

import {CSSProperties, useEffect, useState} from 'react';

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {
  CertificateExpiredIcon,
  ExpiresSoon,
  CertificateRevoked,
  MLSVerified,
  ProteusVerified,
} from '@wireapp/react-ui-kit';

import {ClientEntity} from 'src/script/client';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {TMP_DecoratedWireIdentity} from 'src/script/E2EIdentity';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

export enum MLSStatuses {
  VALID = 'valid',
  NOT_DOWNLOADED = 'not_downloaded',
  EXPIRED = 'expired',
  EXPIRES_SOON = 'expires_soon',
}

interface VerificationBadgesProps {
  conversationProtocol?: ConversationProtocol;
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

const useConversationVerificationState = (conversation: Conversation) => {
  const {verification_state: proteusVerificationState, mlsVerificationState} = useKoSubscribableChildren(conversation, [
    'verification_state',
    'mlsVerificationState',
  ]);
  const mlsState = mlsVerificationState === ConversationVerificationState.VERIFIED ? MLSStatuses.VALID : undefined;
  return {MLS: mlsState, proteus: proteusVerificationState};
};

export const UserVerificationBadges = ({user, groupId}: {user: User; groupId?: string}) => {
  const {is_verified: isProteusVerified} = useKoSubscribableChildren(user, ['is_verified']);

  return <VerificationBadges isProteusVerified={isProteusVerified} />;
};

export const DeviceVerificationBadges = ({
  device,
  getDeviceIdentity,
}: {
  device: ClientEntity;
  getDeviceIdentity?: (deviceId: string) => Promise<TMP_DecoratedWireIdentity | undefined>;
}) => {
  const [MLSStatus, setMLSStatus] = useState<MLSStatuses | undefined>(undefined);
  useEffect(() => {
    if (getDeviceIdentity) {
      void (async () => {
        const identity = await getDeviceIdentity(device.id);
        setMLSStatus(identity?.state ?? MLSStatuses.NOT_DOWNLOADED);
      })();
    }
  });

  return <VerificationBadges isProteusVerified={!!device.meta?.isVerified?.()} MLSStatus={MLSStatus} />;
};

type ConversationVerificationBadgeProps = {
  conversation: Conversation;
  displayTitle?: boolean;
};
export const ConversationVerificationBadges = ({conversation, displayTitle}: ConversationVerificationBadgeProps) => {
  const verificationState = useConversationVerificationState(conversation);

  return (
    <VerificationBadges
      conversationProtocol={conversation.protocol}
      MLSStatus={verificationState.MLS}
      displayTitle={displayTitle}
      isProteusVerified={verificationState.proteus === ConversationVerificationState.VERIFIED}
    />
  );
};

export const VerificationBadges = ({
  conversationProtocol,
  isProteusVerified = false,
  MLSStatus,
  displayTitle = false,
}: VerificationBadgesProps) => {
  if (!MLSStatus && !isProteusVerified) {
    return null;
  }

  const isExpired = MLSStatus === MLSStatuses.EXPIRED;
  const isNotDownloaded = MLSStatus === MLSStatuses.NOT_DOWNLOADED;
  const isExpiresSoon = MLSStatus === MLSStatuses.EXPIRES_SOON;

  const conversationHasProtocol = !!conversationProtocol;

  const showMLSBadge = conversationHasProtocol
    ? conversationProtocol === ConversationProtocol.MLS && !!MLSStatus
    : !!MLSStatus;

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
