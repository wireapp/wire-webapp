/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {FunctionComponent} from 'react';

import {SVGIcon, SVGIconProps} from './svgIcon';

export const NeutralStatusIcon: FunctionComponent<SVGIconProps> = props => {
  return (
    <SVGIcon realWidth={20} realHeight={20} fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M18.4362 8.32151C18.5436 8.86434 18.5999 9.42555 18.5999 9.9999C18.5999 10.5743 18.5436 11.1355 18.4362 11.6783M17.1514 5.22161C16.5235 4.28377 15.716 3.47631 14.7782 2.84844M11.6783 1.5636C11.1355 1.45621 10.5743 1.3999 9.9999 1.3999C9.42555 1.3999 8.86434 1.45621 8.32151 1.5636M5.22161 2.84844C4.28377 3.47631 3.47631 4.28377 2.84844 5.22161M1.5636 8.32151C1.45621 8.86434 1.3999 9.42555 1.3999 9.9999C1.3999 10.5743 1.45621 11.1355 1.5636 11.6783M2.84844 14.7782C3.47631 15.716 4.28377 16.5235 5.22161 17.1514M8.32151 18.4362C8.86434 18.5436 9.42555 18.5999 9.9999 18.5999C10.5743 18.5999 11.1355 18.5436 11.6783 18.4362M14.7782 17.1514C15.716 16.5235 16.5235 15.716 17.1514 14.7782"
        strokeWidth="1.6"
        stroke="#9FA1A7"
      />
    </SVGIcon>
  );
};
