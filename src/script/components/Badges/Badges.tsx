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

import React, {CSSProperties} from 'react';

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {CertificateExpiredIcon, CertificateRevoked, MLSVerified, ProteusVerified} from '@wireapp/react-ui-kit';

export enum MLSStatues {
  VALID = 'valid',
  NOT_DOWNLOADED = 'not_downloaded',
  EXPIRED = 'expired',
}

interface BadgesProps {
  conversationProtocol?: ConversationProtocol;
  isMLSVerified?: boolean;
  isProteusVerified?: boolean;
  MLSStatus?: MLSStatues;
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

export const Badges: React.FC<BadgesProps> = ({
  conversationProtocol,
  isMLSVerified = false,
  isProteusVerified = false,
  MLSStatus,
  displayTitle = false,
}) => {
  if (!isMLSVerified && !isProteusVerified) {
    return null;
  }

  const isExpired = MLSStatus === MLSStatues.EXPIRED;
  const isNotDownloaded = MLSStatus === MLSStatues.NOT_DOWNLOADED;

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
          {displayTitle && <span style={title(true)}>Verified (End-to-end Identity)</span>}

          {!isExpired && !isNotDownloaded && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="Device verified (End-to-end identity)"
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatues.VALID}
            >
              <MLSVerified data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isExpired && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="End-to-end identity certificate expired"
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatues.EXPIRED}
            >
              <CertificateExpiredIcon data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isNotDownloaded && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="End-to-end identity certificate revoked"
              style={iconStyles}
              data-uie-name="mls-status"
              data-uie-value={MLSStatues.NOT_DOWNLOADED}
            >
              <CertificateRevoked data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}
        </div>
      )}

      {showProteusBadge && (
        <div style={badgeWrapper}>
          {displayTitle && <span style={title(false)}>Verified (Proteus)</span>}

          <span
            className="with-tooltip with-tooltip--external"
            data-tooltip="Device verified (Proteus)"
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
