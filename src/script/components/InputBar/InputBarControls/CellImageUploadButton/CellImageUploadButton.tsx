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

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface CellImageUploadButtonProps {
  onClick: () => void;
}

export const CellImageUploadButton = ({onClick}: CellImageUploadButtonProps) => {
  return (
    <button
      type="button"
      aria-label={t('tooltipConversationAddImage')}
      title={t('tooltipConversationAddImage')}
      className="input-bar-control file-button"
      onClick={onClick}
      data-uie-name="do-share-image"
    >
      <Icon.ImageIcon />
    </button>
  );
};
