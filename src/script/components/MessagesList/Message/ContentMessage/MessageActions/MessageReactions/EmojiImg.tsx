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

import {FC} from 'react';

import {CSSObject} from '@emotion/react';

import {messageReactionEmoji, reactionImgSize} from './EmojiImg.styles';

export interface EmojiImgProps {
  emojiUrl: string;
  emojiName: string;
  emojiImgSize?: CSSObject;
  css?: CSSObject;
}

const EmojiImg: FC<EmojiImgProps> = ({emojiUrl, css, emojiName, emojiImgSize = reactionImgSize}) => {
  return (
    <>
      <img
        src={emojiUrl}
        alt={emojiName}
        loading="eager"
        css={{...emojiImgSize, ...messageReactionEmoji, ...css}}
        aria-hidden={true}
      />
    </>
  );
};

export {EmojiImg};
