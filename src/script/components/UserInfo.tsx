/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import React, {ReactNode} from 'react';

import {CSSObject} from '@emotion/react';
import cx from 'classnames';

import {Availability} from '@wireapp/protocol-messaging';

import {selfIndicator} from 'Components/ParticipantItemContent/ParticipantItem.styles';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {CSS_SQUARE} from 'Util/CSSMixin';
import {KEY} from 'Util/KeyboardUtil';

import {Icon} from './Icon';
import {UserName} from './UserName';

import {User} from '../entity/User';

interface AvailabilityStateProps {
  user: User;
  className?: string;
  dataUieName: string;
  selfString?: string;
  title?: string;
  onClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  theme?: boolean;
  showAvailability?: boolean;
  children?: React.ReactNode;
}

const iconStyles: CSSObject = {
  ...CSS_SQUARE(10),
  fill: 'currentColor',
  margin: '0 6px 1px 0',
  minWidth: 10,
  stroke: 'currentColor',
};

const buttonCommonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  textTransform: 'uppercase',
};

const availabilityIconBaseProps = {
  className: 'availability-state-icon',
  css: iconStyles,
  'data-uie-name': 'status-availability-icon',
};
const availabilityIconRenderer: Record<Availability.Type, () => ReactNode> = {
  [Availability.Type.AVAILABLE]: () => (
    <Icon.AvailabilityAvailable {...availabilityIconBaseProps} data-uie-value="available" />
  ),
  [Availability.Type.AWAY]: () => <Icon.AvailabilityAway {...availabilityIconBaseProps} data-uie-value="away" />,
  [Availability.Type.BUSY]: () => <Icon.AvailabilityBusy {...availabilityIconBaseProps} data-uie-value="busy" />,
  [Availability.Type.NONE]: () => null,
};

export const UserInfo: React.FC<AvailabilityStateProps> = ({
  user,
  className,
  dataUieName,
  selfString,
  title,
  theme = false,
  showAvailability,
  onClick,
  children,
}) => {
  const {availability: userAvailability, name} = useKoSubscribableChildren(user, ['availability', 'name']);

  const availability = showAvailability ? userAvailability : Availability.Type.NONE;
  const renderAvailabilityIcon = availabilityIconRenderer[availability];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const {key} = event;
    if (key === KEY.ENTER || key === KEY.SPACE) {
      const {top, left, height} = (event.target as Element).getBoundingClientRect();
      const newEvent = new MouseEvent('MouseEvent', {
        ...event.nativeEvent,
        clientX: left,
        clientY: top + height,
      });

      onClick?.({
        ...event,
        nativeEvent: newEvent,
      } as unknown as React.MouseEvent<Element, MouseEvent>);
    }
  };

  const content = (
    <span data-uie-name={dataUieName} css={{alignItems: 'center', display: 'flex', overflow: 'hidden'}}>
      {renderAvailabilityIcon()}

      <span
        className={cx('availability-state-label', {'availability-state-label--active': theme})}
        css={{userSelect: 'none'}}
        data-uie-name="status-label"
        title={title || name}
      >
        <UserName user={user} />
      </span>

      {selfString && <span css={selfIndicator}>{selfString}</span>}

      {children}
    </span>
  );

  const wrappedContent = onClick ? (
    <button
      type="button"
      className="availability-state-label"
      css={
        theme
          ? {...buttonCommonStyles, color: 'var(--accent-color)', userSelect: 'none'}
          : {...buttonCommonStyles, userSelect: 'none'}
      }
      data-uie-name="status-label"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {content}
    </button>
  ) : (
    content
  );

  if (className) {
    return <span className={`availability-state ${className}`}>{wrappedContent}</span>;
  }

  return wrappedContent;
};
