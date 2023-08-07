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

import {Icon} from 'Components/Icon';

interface BadgesProps {
  conversationProtocol?: string;
  displayBothProtocolBadges?: boolean;
  displayBadgeTitle?: boolean;
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
  conversationProtocol = 'MLS',
  displayBothProtocolBadges = false,
  displayBadgeTitle = false,
}) => {
  const isMLSConversation = conversationProtocol === 'MLS';
  const isProteusConversation = conversationProtocol === 'PROTEUS';

  const isExpired = false;
  const isNotDownloaded = false;
  const isExpiresSoon = false;

  return (
    <div className="conversation-badges" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      {(displayBothProtocolBadges || isMLSConversation) && (
        <div style={badgeWrapper}>
          {displayBadgeTitle && <span style={title(isMLSConversation)}>Verified (End-to-end Identity)</span>}
          {!isExpired && !isNotDownloaded && !isExpiresSoon && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="Device verified (End-to-end identity)"
              style={iconStyles}
            >
              <Icon.NotVerified data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isExpiresSoon && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="End-to-end identity certificate expires soon"
              style={iconStyles}
            >
              <Icon.NotVerified data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isExpired && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="End-to-end identity certificate expired"
              style={iconStyles}
            >
              <Icon.NotVerified data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}

          {isNotDownloaded && (
            <span
              className="with-tooltip with-tooltip--external"
              data-tooltip="End-to-end identity certificate revoked"
              style={iconStyles}
            >
              <Icon.NotVerified data-uie-name="conversation-title-bar-verified-icon" />
            </span>
          )}
        </div>
      )}

      {(displayBothProtocolBadges || isProteusConversation) && (
        <div style={badgeWrapper}>
          {displayBadgeTitle && <span style={title(isProteusConversation)}>Verified (Proteus)</span>}

          <span
            className="with-tooltip with-tooltip--external"
            data-tooltip="Device verified (Proteus)"
            style={iconStyles}
          >
            <Icon.Verified data-uie-name="conversation-title-bar-verified-icon" />
          </span>
        </div>
      )}
    </div>
  );
};
