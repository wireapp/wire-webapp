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

import React from 'react';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

const badgeToComponentMap = {
  guest: () => (
    <span className="guest-icon with-tooltip with-tooltip--external" data-tooltip={t('conversationGuestIndicator')}>
      <Icon.Guest data-uie-name="status-guest" />
    </span>
  ),
  federated: () => (
    <span
      className="federation-icon with-tooltip with-tooltip--external"
      data-tooltip={t('conversationFederationIndicator')}
    >
      <Icon.Federation data-uie-name="status-federated-user" />
    </span>
  ),
  external: () => (
    <span className="partner-icon with-tooltip with-tooltip--external" data-tooltip={t('rolePartner')}>
      <Icon.External data-uie-name="status-external" />
    </span>
  ),
  verified: () => (
    <span className="verified-icon">
      <Icon.Verified data-uie-name="status-verified" />
    </span>
  ),
} as const;

type BadgeKey = keyof typeof badgeToComponentMap;
interface UserBadgesProps {
  config: {[key in BadgeKey]?: boolean};
}

export const UserBadges = ({config}: UserBadgesProps) => {
  return (
    <>
      {Object.entries(config)
        .filter(([_badge, shouldShow]) => shouldShow)
        .map(([badge]) => {
          return <React.Fragment key={badge}>{badgeToComponentMap[badge as BadgeKey]()}</React.Fragment>;
        })}
      ;
    </>
  );
};
