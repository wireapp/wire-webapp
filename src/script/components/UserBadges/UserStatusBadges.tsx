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

import {badgesWrapper, icon} from './UserStatusBadges.styles';

const badgeToComponentMap = {
  guest: () => (
    <span css={icon} className="with-tooltip with-tooltip--external" data-tooltip={t('conversationGuestIndicator')}>
      <Icon.Guest data-uie-name="status-guest" />
    </span>
  ),
  federated: () => (
    <span
      css={icon}
      className="with-tooltip with-tooltip--external"
      data-tooltip={t('conversationFederationIndicator')}
    >
      <Icon.Federation data-uie-name="status-federated-user" />
    </span>
  ),
  external: () => (
    <span css={icon} className="with-tooltip with-tooltip--external" data-tooltip={t('rolePartner')}>
      <Icon.External data-uie-name="status-external" />
    </span>
  ),
  verified: () => (
    <span css={icon}>
      <Icon.Verified data-uie-name="status-verified" />
    </span>
  ),
} as const;

type BadgeKey = keyof typeof badgeToComponentMap;
interface UserStatusBadgesProps {
  config: {[key in BadgeKey]?: boolean};
}

export function UserStatusBadges({config}: UserStatusBadgesProps) {
  const badges = Object.entries(config).filter(([_badge, shouldShow]) => shouldShow);
  const badgesCount = badges.length;

  if (!badgesCount) {
    return null;
  }

  return (
    <div css={badgesWrapper(badgesCount)}>
      {badges.map(([badge]) => (
        <React.Fragment key={badge}>{badgeToComponentMap[badge as BadgeKey]()}</React.Fragment>
      ))}
    </div>
  );
}
