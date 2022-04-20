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
import cx from 'classnames';
import {Availability} from '@wireapp/protocol-messaging';
import {CSSObject} from '@emotion/react';

import {CSS_SQUARE} from 'Util/CSSMixin';
import Icon from './Icon';
import {KEY} from 'Util/KeyboardUtil';

export interface AvailabilityStateProps {
  availability: Availability.Type;
  className?: string;
  dataUieName: string;
  label: string;
  onClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
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

const buttonCommonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  textTransform: 'uppercase',
};

const AvailabilityState: React.FC<AvailabilityStateProps> = ({
  availability,
  className,
  dataUieName,
  label,
  showArrow = false,
  theme = false,
  onClick,
}) => {
  const isAvailable = availability === Availability.Type.AVAILABLE;
  const isAway = availability === Availability.Type.AWAY;
  const isBusy = availability === Availability.Type.BUSY;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const {key} = event;
    if (key === KEY.ENTER || key === KEY.SPACE) {
      const {top, left, height} = (event.target as Element).getBoundingClientRect();
      const newEvent = new MouseEvent('MouseEvent', {
        ...event.nativeEvent,
        clientX: left,
        clientY: top + height,
      });

      onClick({
        ...event,
        nativeEvent: newEvent,
      } as unknown as React.MouseEvent<Element, MouseEvent>);
    }
  };

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
        <span
          className={cx('availability-state-label', {'availability-state-label--active': theme})}
          css={{userSelect: 'none'}}
          data-uie-name="status-label"
        >
          {label}
        </span>
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
            alignItems: 'center',
            display: 'inline-flex',
            marginLeft: 4,
            marginTop: 4,
            paddingBottom: 4,
            ...CSS_SQUARE(16),
          }}
        />
      )}
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

export default AvailabilityState;
