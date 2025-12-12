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

import cx from 'classnames';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface RestrictedImageProps {
  isSmall?: boolean;
  showMessage?: boolean;
  className?: string;
}

const RestrictedImage = ({showMessage = true, isSmall = false, className}: RestrictedImageProps) => {
  return (
    <div className={cx('image-restricted', className, {'image-restricted--small': isSmall})}>
      <div className="image-restricted--container">
        <div className="flex-center" data-uie-name="file-icon">
          <Icon.ImageIcon />
        </div>
        {showMessage && <div className="image-restricted--message">{t('conversationImageAssetRestricted')}</div>}
      </div>
    </div>
  );
};

export {RestrictedImage};
