/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/serialize';
import {amplify} from 'amplify';
import cx from 'classnames';

import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Icon} from 'Components/Icon';
import {CSS_SQUARE} from 'Util/CSSMixin';
import {t} from 'Util/LocalizerUtil';

import {ContextMenuEntry} from '../../../../../ui/ContextMenu';

interface AvailabilityInputProps {
  availability: Availability.Type;
}

const iconStyles: CSSObject = {
  ...CSS_SQUARE(10),
  fill: 'currentColor',
  margin: '0 6px 1px 0',
  minWidth: 10,
  stroke: 'currentColor',
};

const headerStyles: CSSObject = {
  lineHeight: '0.875rem',
  margin: '37px 0 6px',
  padding: 0,
};

const AvailabilityButtons: React.FC<AvailabilityInputProps> = ({availability}) => {
  const icons: {
    [key: string]: any;
  } = {
    [Availability.Type.AVAILABLE]: (
      <Icon.AvailabilityAvailable
        className="availability-state-icon"
        css={{...iconStyles, fill: 'var(--green-500)', stroke: 'var(--green-500)'}}
        data-uie-name="status-availability-icon"
        data-uie-value="available"
      />
    ),
    [Availability.Type.BUSY]: (
      <Icon.AvailabilityBusy
        className="availability-state-icon"
        css={{...iconStyles, fill: 'var(--amber-500)', stroke: 'var(--amber-500)'}}
        data-uie-name="status-availability-icon"
        data-uie-value="busy"
      />
    ),
    [Availability.Type.AWAY]: (
      <Icon.AvailabilityAway
        className="availability-state-icon"
        css={{...iconStyles, fill: 'var(--red-500)', stroke: 'var(--red-500)'}}
        data-uie-name="status-availability-icon"
        data-uie-value="away"
      />
    ),
    [Availability.Type.NONE]: null,
  };
  const entries: ContextMenuEntry[] = [
    {
      availability: Availability.Type.AVAILABLE,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AVAILABLE),
      label: t('userAvailabilityAvailable'),
    },
    {
      availability: Availability.Type.BUSY,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.BUSY),
      label: t('userAvailabilityBusy'),
    },
    {
      availability: Availability.Type.AWAY,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.AWAY),
      label: t('userAvailabilityAway'),
    },
    {
      availability: Availability.Type.NONE,
      click: () => amplify.publish(WebAppEvents.USER.SET_AVAILABILITY, Availability.Type.NONE),
      label: t('userAvailabilityNone'),
    },
  ];

  return (
    <>
      <h3 className="label" css={headerStyles}>
        {t('preferencesAccountAvailabilityUnset')}
      </h3>
      <div className="buttons-group">
        {entries.map((item, index) => {
          const isActive = availability === item.availability;
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;

          return (
            <button
              className={cx('buttons-group-button', {
                'buttons-group-button-active': isActive,
                'buttons-group-button-left': isFirst,
                'buttons-group-button-right': isLast,
              })}
              key={item.availability}
              type="button"
              onClick={() => item.click?.()}
              aria-label={
                isActive
                  ? `${t('preferencesAccountSelectedLabel')}, ${item.label}`
                  : `${t('preferencesAccountUpdateLabel')} ${item.label}`
              }
            >
              {item.availability !== undefined && icons[item.availability]}
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
};

export {AvailabilityButtons};
