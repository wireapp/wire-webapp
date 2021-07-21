/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

export interface RestrictedImageProps extends React.HTMLProps<HTMLDivElement> {
  isSmall?: boolean;
  showMessage?: boolean;
}

const RestrictedImage: React.FC<RestrictedImageProps> = ({showMessage = true, isSmall = false, className}) => {
  return (
    <div className={cx('image-restricted', className, {'image-restricted--small': isSmall})}>
      <div className="image-restricted--container">
        <div className="flex-center file-icon icon-file" data-uie-name="file-icon">
          <span className="file-icon-ext icon-block"></span>
        </div>
        {showMessage && <div className="image-restricted--message">{t('conversationAssetRestricted')}</div>}
      </div>
    </div>
  );
};

export default RestrictedImage;

registerReactComponent<RestrictedImageProps>('image-restricted', {
  component: RestrictedImage,
  template: '<span data-bind="react: {className, showMessage}"></span>',
});
