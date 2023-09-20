/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FC} from 'react';

import {CSSObject} from '@emotion/react';

import {messageReactionEmoji, reactionImgSize} from './EmojiImg.styles';

export interface EmojiImgProps {
  emojiUrl: string;
  emojiName: string;
  emojiImgSize?: CSSObject;
  styles?: CSSObject;
}

const EmojiImg: FC<EmojiImgProps> = ({emojiUrl, styles, emojiName, emojiImgSize = reactionImgSize}) => {
  return (
    <>
      <img
        alt={emojiName}
        aria-hidden={true}
        css={{...emojiImgSize, ...messageReactionEmoji, ...styles}}
        draggable="false"
        loading="eager"
        src={emojiUrl}
      />
    </>
  );
};

export {EmojiImg};
