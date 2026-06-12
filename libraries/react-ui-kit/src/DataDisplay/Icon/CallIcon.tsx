/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

export const CallIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={20} realHeight={14} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 6.44c0-2.278 0-3.417.45-4.284A4 4 0 0 1 2.156.45C3.023 0 4.162 0 6.44 0h2.12c2.278 0 3.417 0 4.284.45a4 4 0 0 1 1.706 1.706c.45.867.45 2.006.45 4.284v1.12c0 2.278 0 3.417-.45 4.284a4 4 0 0 1-1.706 1.706c-.867.45-2.006.45-4.284.45H6.44c-2.278 0-3.417 0-4.284-.45A4 4 0 0 1 .45 11.844C0 10.977 0 9.838 0 7.56V6.44Zm5.5 2.202C6.903 10.043 8.573 11.5 9.966 11.5c.626 0 1.175-.218 1.617-.703.257-.286.417-.62.417-.95a.759.759 0 0 0-.32-.64l-1.49-1.056c-.224-.155-.418-.233-.593-.233-.218 0-.417.126-.64.344-.135.132-.53.417-.53.417-1.093-.736-1.882-1.518-2.616-2.612 0 0 .286-.397.417-.533.214-.223.345-.417.345-.64 0-.174-.078-.363-.243-.591L5.286 2.834a.79.79 0 0 0-.67-.334c-.32 0-.65.145-.936.422C3.209 3.372 3 3.93 3 4.545c0 1.391 1.097 2.702 2.5 4.097Z"
    />
    <path d="M20 3.098v7.804a1 1 0 0 1-1.63.777L16.3 10V4l2.07-1.679a1 1 0 0 1 1.63.777Z" />
  </SVGIcon>
);
