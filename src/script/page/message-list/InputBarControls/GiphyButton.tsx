/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {IconButton} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

export type GiphyButtonProps = {
  onGifClick: () => void;
};

const GiphyButton: React.FC<GiphyButtonProps> = ({onGifClick}) => {
  return (
    <>
      <li>
        <IconButton
          type="button"
          css={{marginBottom: '0'}}
          title={t('extensionsBubbleButtonGif')}
          aria-label={t('extensionsBubbleButtonGif')}
          onClick={onGifClick}
          data-uie-name="do-giphy-popover"
        >
          <Icon.Gif />
        </IconButton>
      </li>
    </>
  );
};

export {GiphyButton};
