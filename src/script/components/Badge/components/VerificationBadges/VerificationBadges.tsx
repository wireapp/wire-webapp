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
  TabIndex,
  CertificateExpiredIcon,
  CertificateRevoked,
  ExpiresSoon,
  MLSVerified,
  ProteusVerified,
  Tooltip,
} from '@wireapp/react-ui-kit';

import {useUserIdentity} from 'Hooks/useDeviceIdentities';
import {ClientEntity} from 'Repositories/client';
import {ConversationVerificationState} from 'Repositories/conversation/ConversationVerificationState';
import {checkUserHandle} from 'Repositories/conversation/ConversationVerificationStateHandler';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/UserState';
import {MLSStatuses, WireIdentity} from 'src/script/E2EIdentity/E2EIdentityVerification';
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
  color: isMLSConversation ? 'var(--success-color)' : 'var(--blue-500)',
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

const getMLSStatuses = ({identities, user}: {identities?: WireIdentity[]; user?: User}): MLSStatuses[] | undefined => {
  if (!identities || !user) {
    return undefined;
  }

  return identities.map(identity => {
    const matchingName = identity.x509Identity?.displayName === user.name();
    const matchingHandle = checkUserHandle(identity, user);

    if (!matchingName || !matchingHandle) {
      return MLSStatuses.NOT_ACTIVATED;
    }
    return identity.status;
  });
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

  const mlsStatuses = getMLSStatuses({
    identities: deviceIdentities,
    user,
  });

  let status: MLSStatuses | undefined = undefined;
  if (mlsStatuses && mlsStatuses.length > 0 && mlsStatuses.every(status => status === MLSStatuses.VALID)) {
    status = MLSStatuses.VALID;
  }

  return <VerificationBadges context="user" isProteusVerified={isProteusVerified} MLSStatus={status} />;
};

export const DeviceVerificationBadges = ({
  device,
  getIdentity,
  isE2EIEnabled = false,
}: {
  device: ClientEntity;
  getIdentity?: (deviceId: string) => WireIdentity | undefined;
  isE2EIEnabled?: boolean;
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

  let status: MLSStatuses | undefined = undefined;
  if (isE2EIEnabled && identity && user) {
    const mlsStatuses = getMLSStatuses({identities: [identity], user});
    status = mlsStatuses?.[0];
  }

  return <VerificationBadges context="device" isProteusVerified={!!device.meta?.isVerified?.()} MLSStatus={status} />;
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

const MLSVerificationBadge = ({
  context,
  MLSStatus,
  tooltipId,
}: {
  MLSStatus?: MLSStatuses;
  context: VerificationBadgeContext;
  tooltipId: string;
}) => {
  const mlsVerificationProps = {
    css: iconStyles,
    'data-uie-name': `mls-${context}-status`,
    'data-uie-value': MLSStatus,
  };

  const TooltipIcon = ({children, body, ...props}: {body: string; children: React.ReactNode}) => (
    <>
      <div id={tooltipId} role="tooltip" aria-label={body}></div>
      <Tooltip {...props} body={body}>
        {children}
      </Tooltip>
    </>
  );

  switch (MLSStatus) {
    case MLSStatuses.VALID:
      const translationKeys: Record<VerificationBadgeContext, StringIdentifer> = {
        conversation: 'E2EI.conversationVerified',
        user: 'E2EI.userDevicesVerified',
        device: 'E2EI.deviceVerified',
      };

      return (
        // @ts-expect-error: too broad `translationKeys` type, todo: narrow it down
        <TooltipIcon {...mlsVerificationProps} body={t(translationKeys[context])}>
          <MLSVerified />
        </TooltipIcon>
      );
    case MLSStatuses.NOT_ACTIVATED:
      return (
        <TooltipIcon {...mlsVerificationProps} body={t('E2EI.certificateNotDownloaded')}>
          <CertificateExpiredIcon />
        </TooltipIcon>
      );
    case MLSStatuses.EXPIRED:
      return (
        <TooltipIcon {...mlsVerificationProps} body={t('E2EI.certificateExpired')}>
          <CertificateExpiredIcon />
        </TooltipIcon>
      );
    case MLSStatuses.REVOKED:
      return (
        <TooltipIcon {...mlsVerificationProps} body={t('E2EI.certificateRevoked')}>
          <CertificateRevoked />
        </TooltipIcon>
      );
    case MLSStatuses.EXPIRES_SOON:
      return (
        <TooltipIcon {...mlsVerificationProps} body={t('E2EI.certificateExpiresSoon')}>
          <ExpiresSoon />
        </TooltipIcon>
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
  const id = useRef(new Date().getTime());

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

  const mlsTooltipId = `mls-verified-tooltip_${id.current}`;
  const proteusTooltipId = `proteus-verified-tooltip_${id.current}`;

  return (
    <div className="conversation-badges" css={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      {showMLSBadge && (
        <div css={badgeWrapper} tabIndex={TabIndex.FOCUSABLE} aria-describedby={mlsTooltipId}>
          {displayTitle && <span style={title(true)}>{t('E2EI.verified')}</span>}

          <MLSVerificationBadge MLSStatus={MLSStatus} context={context} tooltipId={mlsTooltipId} />
        </div>
      )}

      {showProteusBadge && (
        <div css={badgeWrapper} tabIndex={TabIndex.FOCUSABLE} aria-describedby={proteusTooltipId}>
          {displayTitle && <span style={title(false)}>{t('proteusVerifiedDetails')}</span>}

          <div id={proteusTooltipId} role="tooltip" aria-label={t('proteusDeviceVerified')}></div>
          <Tooltip body={t('proteusDeviceVerified')} css={iconStyles} data-uie-name="proteus-verified">
            <ProteusVerified data-uie-name={`proteus-${context}-verified`} />
          </Tooltip>
        </div>
      )}
    </div>
  );
};
