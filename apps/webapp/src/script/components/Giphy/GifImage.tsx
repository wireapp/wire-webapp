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

import {FC, useState} from 'react';

interface GifProps {
  src: string;
  animatedSrc?: string;
  objectFit?: 'contain' | 'cover';
  title?: string;
}

const GifImage: FC<GifProps> = ({src, animatedSrc, objectFit = 'contain', title = ''}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <img
      src={isHovered ? animatedSrc : src}
      alt={title || 'giphy image'}
      css={{height: '100%', objectFit, width: '100%'}}
      {...(!!animatedSrc && {
        onMouseOut: () => {
          setIsHovered(false);
        },
        onMouseOver: () => {
          setIsHovered(true);
        },
      })}
    />
  );
};

export {GifImage};
