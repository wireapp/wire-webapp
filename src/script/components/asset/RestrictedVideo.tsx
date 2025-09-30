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

import cx from 'classnames';

import {t} from 'Util/LocalizerUtil';

interface RestrictedVideoProps {
  isSmall?: boolean;
  showMessage?: boolean;
  className?: string;
}

const RestrictedVideo: React.FC<RestrictedVideoProps> = ({showMessage = true, isSmall = false, className}) => {
  return (
    <div
      className={cx('video-asset__restricted', className, {
        'video-asset__restricted--small': isSmall,
      })}
    >
      <div className="video-asset__restricted--container">
        <div className="flex-center" data-uie-name="file-icon">
          <div className="video-asset__restricted__play-button icon-play" />
        </div>
        {showMessage && <div className="video-asset__restricted--message">{t('conversationVideoAssetRestricted')}</div>}
      </div>
    </div>
  );
};

export {RestrictedVideo};
