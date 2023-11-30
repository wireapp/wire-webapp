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

import {CSSProperties} from 'react';

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
import {MLSStatuses, WireIdentity} from 'src/script/E2EIdentity/E2EIdentityVerification';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {useUserIdentity} from 'src/script/hooks/useDeviceIdentities';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

type VerificationBadgeContext = 'user' | 'conversation' | 'device';
interface VerificationBadgesProps {
  conversationProtocol?: ConversationProtocol;
  isProteusVerified?: boolean;
  MLSStatus?: MLSStatuses;
  displayTitle?: boolean;
  context: VerificationBadgeContext;
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
  const {status: MLSStatus} = useUserIdentity(user.qualifiedId, groupId);
  const {is_verified: isProteusVerified} = useKoSubscribableChildren(user, ['is_verified']);

  return <VerificationBadges context="user" isProteusVerified={isProteusVerified} MLSStatus={MLSStatus} />;
};

export const DeviceVerificationBadges = ({
  device,
  getIdentity,
}: {
  device: ClientEntity;
  getIdentity?: (deviceId: string) => WireIdentity | undefined;
}) => {
  const MLSStatus = getIdentity ? getIdentity(device.id)?.status ?? MLSStatuses.NOT_DOWNLOADED : undefined;

  return (
    <VerificationBadges context="device" isProteusVerified={!!device.meta?.isVerified?.()} MLSStatus={MLSStatus} />
  );
};

type ConversationVerificationBadgeProps = {
  conversation: Conversation;
  displayTitle?: boolean;
};
export const ConversationVerificationBadges = ({conversation, displayTitle}: ConversationVerificationBadgeProps) => {
  const verificationState = useConversationVerificationState(conversation);

  return (
    <VerificationBadges
      context="conversation"
      conversationProtocol={conversation.protocol}
      MLSStatus={verificationState.MLS}
      displayTitle={displayTitle}
      isProteusVerified={verificationState.proteus === ConversationVerificationState.VERIFIED}
    />
  );
};

const MLSVerificationBadge = ({context, MLSStatus}: {MLSStatus?: MLSStatuses; context: VerificationBadgeContext}) => {
  const mlsVerificationProps = {
    className: 'with-tooltip with-tooltip--external',
    style: iconStyles,
    'data-uie-name': `mls-${context}-status`,
  };

  switch (MLSStatus) {
    case MLSStatuses.VALID:
      return (
        <span {...mlsVerificationProps} data-tooltip={t('E2EI.deviceVerified')} data-uie-value={MLSStatuses.VALID}>
          <MLSVerified />
        </span>
      );
    case MLSStatuses.NOT_DOWNLOADED:
      <span
        {...mlsVerificationProps}
        data-tooltip={t('E2EI.certificateRevoked')}
        data-uie-value={MLSStatuses.NOT_DOWNLOADED}
      >
        <CertificateRevoked />
      </span>;
    case MLSStatuses.EXPIRED:
      return (
        <span
          {...mlsVerificationProps}
          data-tooltip={t('E2EI.certificateExpired')}
          data-uie-value={MLSStatuses.EXPIRED}
        >
          <CertificateExpiredIcon />
        </span>
      );
    case MLSStatuses.EXPIRES_SOON:
      <span
        {...mlsVerificationProps}
        data-tooltip={t('E2EI.certificateExpiresSoon')}
        data-uie-value={MLSStatuses.EXPIRES_SOON}
      >
        <ExpiresSoon />
      </span>;
  }
  return null;
};

export const VerificationBadges = ({
  conversationProtocol,
  isProteusVerified = false,
  MLSStatus,
  displayTitle = false,
  context,
}: VerificationBadgesProps) => {
  if (!MLSStatus && !isProteusVerified) {
    return null;
  }

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
          <MLSVerificationBadge MLSStatus={MLSStatus} context={context} />
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
            <ProteusVerified data-uie-name={`proteus-${context}-verified`} />
          </span>
        </div>
      )}
    </div>
  );
};
