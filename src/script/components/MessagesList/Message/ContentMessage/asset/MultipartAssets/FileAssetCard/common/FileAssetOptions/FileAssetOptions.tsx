/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {DropdownMenu, MoreIcon} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile} from 'Util/util';

import {buttonStyles, iconStyles} from './FileAssetOptions.styles';

interface FileAssetOptionsProps {
  src?: string;
  name: string;
  extension: string;
  onOpen: () => void;
}

export const FileAssetOptions = ({onOpen, src, name, extension}: FileAssetOptionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <button aria-label={t('cells.options.label')} css={buttonStyles}>
          <MoreIcon css={iconStyles} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={onOpen}>{t('cells.options.open')}</DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={() => forcedDownloadFile({url: src || '', name: `${name}.${extension}`})}
          aria-label={t('cells.options.download')}
        >
          {t('cells.options.download')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
