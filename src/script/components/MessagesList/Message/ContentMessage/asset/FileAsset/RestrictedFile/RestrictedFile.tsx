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

import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {t} from 'Util/LocalizerUtil';
import {trimFileExtension} from 'Util/util';

interface RestrictedFileProps {
  asset?: FileAsset;
}

const RestrictedFile: React.FC<RestrictedFileProps> = ({asset}) => {
  const fileName = asset?.file_name && trimFileExtension(asset.file_name);
  return (
    <div className="file">
      <div className="file__icon icon-file" data-uie-name="file-icon">
        <span className="file__icon__ext icon-block" />
      </div>
      <div className="file__desc">
        {fileName && (
          <div className="label-bold-xs ellipsis" data-uie-name="file-name">
            {fileName}
          </div>
        )}
        <ul className="file__desc__meta label-xs text-foreground">
          <li data-uie-name="file-restrictions">{t('conversationFileAssetRestricted')}</li>
        </ul>
      </div>
    </div>
  );
};

export {RestrictedFile};
