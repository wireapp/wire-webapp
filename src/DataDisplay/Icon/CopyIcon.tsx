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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const CopyIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={12} realHeight={10} {...props}>
    <path d="M4.5 7.5h6v-6h-6v6zM1.5 3v7.5H9v.748a.754.754 0 01-.746.752H.746A.753.753 0 010 11.248V3.752C0 3.336.342 3 .746 3H1.5zm9.754-3c.412 0 .746.342.746.752V8.25a.754.754 0 01-.746.751H3.746A.754.754 0 013 8.248V.752C3 .337 3.342 0 3.746 0z" />
  </SVGIcon>
);
