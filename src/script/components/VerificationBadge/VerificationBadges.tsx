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

import {CSSProperties, useEffect, useMemo, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {stringifyQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {container} from 'tsyringe';

import {
  CertificateExpiredIcon,
  CertificateRevoked,
  ExpiresSoon,
  MLSVerified,
  ProteusVerified,
  Tooltip,
} from '@wireapp/react-ui-kit';

import {ClientEntity} from 'src/script/client';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {checkUserHandle} from 'src/script/conversation/ConversationVerificationStateHandler';
import {MLSStatuses, WireIdentity} from 'src/script/E2EIdentity/E2EIdentityVerification';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {useUserIdentity} from 'src/script/hooks/useDeviceIdentities';
import {UserState} from 'src/script/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {StringIdentifer, t} from 'Util/LocalizerUtil';
import {waitFor} from 'Util/waitFor';

type VerificationBadgeContext = 'user' | 'conversation' | 'device';

interface VerificationBadgesProps {
  conversationProtocol?: ConversationProtocol;
  isProteusVerified?: boolean;
  MLSStatus?: MLSStatuses;
  displayTitle?: boolean;
  context: VerificationBadgeContext;
}

const badgeWrapper: CSSObject = {
  display: 'flex',
  alignItems: 'center',
};

const iconStyles: CSSObject = {
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

const useMLSStatuses = ({identities, user}: {identities?: WireIdentity[]; user?: User}): MLSStatuses[] | undefined => {
  if (!identities || !user) {
    return undefined;
  }

  identities.forEach(identity => {
    const matchingName = identity.displayName === user.name();
    const matchingHandle = checkUserHandle(identity, user);

    if (!matchingName || !matchingHandle) {
      return undefined;
    }
  });

  return identities.map(identity => identity.status);
};

export const UserVerificationBadges = ({
  user,
  groupId,
  isSelfUser,
}: {
  user: User;
  groupId?: string;
  isSelfUser?: boolean;
}) => {
  const {is_verified: isProteusVerified} = useKoSubscribableChildren(user, ['is_verified']);
  const {deviceIdentities} = useUserIdentity(user.qualifiedId, groupId, isSelfUser);
  const mlsStatuses = useMLSStatuses({
    identities: deviceIdentities,
    user,
  });

  const status = !mlsStatuses
    ? undefined
    : mlsStatuses.length > 0 && mlsStatuses.every(status => status === MLSStatuses.VALID)
      ? MLSStatuses.VALID
      : MLSStatuses.NOT_ACTIVATED;

  return <VerificationBadges context="user" isProteusVerified={isProteusVerified} MLSStatus={status} />;
};

export const DeviceVerificationBadges = ({
  device,
  getIdentity,
}: {
  device: ClientEntity;
  getIdentity?: (deviceId: string) => WireIdentity | undefined;
}) => {
  const userState = useRef(container.resolve(UserState));
  const identity = useMemo(() => getIdentity?.(device.id), [device, getIdentity]);
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    // using active flag in combination with the cleanup to prevent race conditions
    let active = true;
    void loadUser();
    return () => {
      active = false;
    };

    async function loadUser() {
      if (!identity) {
        return;
      }
      const userEntity = await waitFor(() =>
        userState.current
          .users()
          .find(user => stringifyQualifiedId(user.qualifiedId) === stringifyQualifiedId(identity.qualifiedUserId)),
      );
      if (!active) {
        return;
      }
      setUser(userEntity);
    }
  }, [identity]);

  const mlsStatuses = useMLSStatuses({identities: identity ? [identity] : [], user});
  const mlsStatus = mlsStatuses?.[0];

  return (
    <VerificationBadges context="device" isProteusVerified={!!device.meta?.isVerified?.()} MLSStatus={mlsStatus} />
  );
};

type ConversationVerificationBadgeProps = {
  conversation: Conversation;
  displayTitle?: boolean;
};
export const ConversationVerificationBadges = ({conversation, displayTitle}: ConversationVerificationBadgeProps) => {
  const {MLS, proteus} = useConversationVerificationState(conversation);

  return (
    <VerificationBadges
      context="conversation"
      conversationProtocol={conversation.protocol}
      MLSStatus={MLS}
      displayTitle={displayTitle}
      isProteusVerified={proteus === ConversationVerificationState.VERIFIED}
    />
  );
};

const MLSVerificationBadge = ({context, MLSStatus}: {MLSStatus?: MLSStatuses; context: VerificationBadgeContext}) => {
  const mlsVerificationProps = {
    css: iconStyles,
    'data-uie-name': `mls-${context}-status`,
    'data-uie-value': MLSStatus,
  };

  switch (MLSStatus) {
    case MLSStatuses.VALID:
      const translationKeys: Record<VerificationBadgeContext, StringIdentifer> = {
        conversation: 'E2EI.conversationVerified',
        user: 'E2EI.userDevicesVerified',
        device: 'E2EI.deviceVerified',
      };

      return (
        <Tooltip body={t(translationKeys[context])} {...mlsVerificationProps}>
          <MLSVerified />
        </Tooltip>
      );
    case MLSStatuses.NOT_ACTIVATED:
      return (
        <Tooltip {...mlsVerificationProps} body={t('E2EI.certificateNotDownloaded')}>
          <CertificateExpiredIcon />
        </Tooltip>
      );
    case MLSStatuses.EXPIRED:
      return (
        <Tooltip {...mlsVerificationProps} body={t('E2EI.certificateExpired')}>
          <CertificateExpiredIcon />
        </Tooltip>
      );
    case MLSStatuses.REVOKED:
      return (
        <Tooltip {...mlsVerificationProps} body={t('E2EI.certificateRevoked')}>
          <CertificateRevoked />
        </Tooltip>
      );
    case MLSStatuses.EXPIRES_SOON:
      return (
        <Tooltip {...mlsVerificationProps} body={t('E2EI.certificateExpiresSoon')}>
          <ExpiresSoon />
        </Tooltip>
      );
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
    <div className="conversation-badges" css={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      {showMLSBadge && (
        <div css={badgeWrapper}>
          {displayTitle && <span style={title(true)}>{t('E2EI.verified')}</span>}
          <MLSVerificationBadge MLSStatus={MLSStatus} context={context} />
        </div>
      )}

      {showProteusBadge && (
        <div css={badgeWrapper}>
          {displayTitle && <span style={title(false)}>{t('proteusVerifiedDetails')}</span>}

          <Tooltip body={t('proteusDeviceVerified')} css={iconStyles} data-uie-name="proteus-verified">
            <ProteusVerified data-uie-name={`proteus-${context}-verified`} />
          </Tooltip>
        </div>
      )}
    </div>
  );
};
