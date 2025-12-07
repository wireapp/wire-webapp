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

import {CSSObject, css} from '@emotion/react';

import {getEmojiUnicode} from 'Util/EmojiUtil';

interface EmojiImgProps {
  emoji: string;
  size?: number;
  styles?: CSSObject;
}

export const EmojiChar: FC<EmojiImgProps> = ({emoji, size, styles}) => {
  const fontSize = size ? `${size}px` : 'var(--font-size-medium)';
  const style = {
    color: 'var(--main-color)',
    ':after': {
      content: `'${emoji}'`,
    },
  };

  const unicode = getEmojiUnicode(emoji);
  const cssStyles = css({
    fontSize,
    ...style,
    ...styles,
    label: unicode,
  });
  return <span aria-hidden={true} css={cssStyles}></span>;
};
