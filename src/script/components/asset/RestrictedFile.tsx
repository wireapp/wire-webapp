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
import {FileAsset} from 'src/script/entity/message/FileAsset';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {trimFileExtension} from 'Util/util';

export interface RestrictedFileProps extends React.HTMLProps<HTMLDivElement> {
  asset?: FileAsset;
}

const RestrictedFile: React.FC<RestrictedFileProps> = ({asset}) => {
  const fileName = trimFileExtension(asset?.file_name);
  return (
    <div className="file">
      <div className="file-icon icon-file" data-uie-name="file-icon">
        <span className="file-icon-ext icon-block"></span>
      </div>
      <div className="file-desc">
        {fileName && (
          <div className="label-bold-xs ellipsis" data-uie-name="file-name">
            {fileName}
          </div>
        )}
        <ul className="file-desc-meta label-nocase-xs text-foreground">
          <li data-uie-name="file-restrictions">{t('conversationAssetRestricted')}</li>
        </ul>
      </div>
    </div>
  );
};

export default RestrictedFile;

registerReactComponent<RestrictedFileProps>('file-restricted', {
  component: RestrictedFile,
  template: '<span data-bind="react: {asset: ko.unwrap(asset)}"></span>',
});
