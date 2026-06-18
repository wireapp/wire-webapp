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

import {Fragment} from 'react';

import {Tooltip} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {RootContextValue, useApplicationContext} from 'src/script/page/RootProvider';

import {badgesWrapper, icon} from './UserStatusBadges.styles';

function createBadgeToComponentMap(translate: RootContextValue['translate']) {
  return {
    guest: () => (
      <Tooltip css={icon} body={translate('conversationGuestIndicator')}>
        <Icon.GuestIcon data-uie-name="status-guest" />
      </Tooltip>
    ),
    federated: () => (
      <Tooltip css={icon} body={translate('conversationFederationIndicator')}>
        <Icon.FederationIcon data-uie-name="status-federated-user" />
      </Tooltip>
    ),
    external: () => (
      <Tooltip css={icon} body={translate('rolePartner')}>
        <Icon.ExternalIcon data-uie-name="status-external" />
      </Tooltip>
    ),
    verified: () => (
      <span css={icon}>
        <Icon.VerifiedIcon data-uie-name="status-verified" />
      </span>
    ),
  } as const;
}

type BadgeMap = ReturnType<typeof createBadgeToComponentMap>;

type BadgeKey = keyof BadgeMap;
interface UserStatusBadgesProps {
  config: {[key in BadgeKey]?: boolean};
}

export const UserStatusBadges = ({config}: UserStatusBadgesProps) => {
  const {translate} = useApplicationContext();
  const badgeToComponentMap = createBadgeToComponentMap(translate);
  const badges = Object.entries(config).filter(([_badge, shouldShow]) => shouldShow);
  const badgesCount = badges.length;

  if (!badgesCount) {
    return null;
  }

  return (
    <div css={badgesWrapper(badgesCount)}>
      {badges.map(([badge]) => (
        <Fragment key={badge}>{badgeToComponentMap[badge as BadgeKey]()}</Fragment>
      ))}
    </div>
  );
};
