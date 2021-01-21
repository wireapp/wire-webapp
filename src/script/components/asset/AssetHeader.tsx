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

import React, {Fragment} from 'react';
import cx from 'classnames';

import {formatDayMonthNumeral, formatTimeShort} from 'Util/TimeUtil';
import {registerReactComponent} from 'Util/ComponentUtil';

import type {Message} from '../../entity/message/Message';

export interface AssetHeaderProps {
  message: Message;
}

const AssetHeader: React.FC<AssetHeaderProps> = ({message}) => {
  const timestamp = message.timestamp();
  const timeText = `${formatDayMonthNumeral(timestamp)} ${formatTimeShort(timestamp)}`;

  return (
    <Fragment>
      <span className={cx('asset-header-name', message.accent_color)} data-uie-name="user-name">
        {message.user().name()}
      </span>
      <span className="asset-header-time" data-uie-name="header-time">
        {timeText}
      </span>
    </Fragment>
  );
};

export default AssetHeader;

registerReactComponent('asset-header', {
  component: AssetHeader,
  template: `
    <span class="asset-header-name" data-bind="react: {text: message_et.user().name(), css: message_et.accent_color}"></span>
    <span class="asset-header-time" data-bind="react: {text: timeText}"></span>
  `,
});
