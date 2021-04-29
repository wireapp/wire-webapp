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

import React from 'react';
import {Availability} from '@wireapp/protocol-messaging';
import {CSSObject} from '@emotion/core';

import {registerReactComponent} from 'Util/ComponentUtil';
import {CSS_SQUARE} from 'Util/CSSMixin';
import Icon from './Icon';

export interface AvailabilityStateProps {
  availability: Availability.Type;
  className?: string;
  dataUieName: string;
  label: string;
  showArrow?: boolean;
  theme?: boolean;
}

const iconStyles: CSSObject = {
  ...CSS_SQUARE(10),
  fill: 'currentColor',
  margin: '0 6px 1px 0',
  minWidth: 10,
  stroke: 'currentColor',
};

const AvailabilityState: React.FC<AvailabilityStateProps> = ({
  availability,
  className,
  dataUieName,
  label,
  showArrow = false,
  theme = false,
}) => {
  const isAvailable = availability === Availability.Type.AVAILABLE;
  const isAway = availability === Availability.Type.AWAY;
  const isBusy = availability === Availability.Type.BUSY;

  const content = (
    <span data-uie-name={dataUieName} css={{alignItems: 'center', display: 'flex', overflow: 'hidden'}}>
      {isAvailable && (
        <Icon.AvailabilityAvailable
          className="availability-state-icon"
          css={iconStyles}
          data-uie-name="status-availability-icon"
          data-uie-value="available"
        />
      )}

      {isAway && (
        <Icon.AvailabilityAway
          className="availability-state-icon"
          css={iconStyles}
          data-uie-name="status-availability-icon"
          data-uie-value="away"
        />
      )}

      {isBusy && (
        <Icon.AvailabilityBusy
          className="availability-state-icon"
          css={iconStyles}
          data-uie-name="status-availability-icon"
          data-uie-value="busy"
        />
      )}

      {label && (
        <div
          className="availability-state-label"
          css={theme ? {color: 'var(--accent-color)', userSelect: 'none'} : {userSelect: 'none'}}
          data-uie-name="status-label"
        >
          {label}
        </div>
      )}

      {showArrow && (
        <span
          data-uie-name="availability-arrow"
          css={{
            '&::before': {
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid currentColor',
              content: "''",
              height: 0,
              width: 0,
            },
            display: 'inline-block',
            marginLeft: 4,
            paddingBottom: 4,
            ...CSS_SQUARE(16),
          }}
        />
      )}
    </span>
  );

  if (className) {
    return <span className={`availability-state ${className}`}>{content}</span>;
  }

  return content;
};

export default AvailabilityState;

registerReactComponent<AvailabilityStateProps>('availability-state', {
  component: AvailabilityState,
  optionalParams: ['showArrow', 'theme', 'className'],
  template:
    '<span class="availability-state" data-bind="react: {availability: ko.unwrap(availability), label: ko.unwrap(label), showArrow, dataUieName, theme: ko.unwrap(theme)}"></span>',
});
