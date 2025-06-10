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

import {SVGIcon, SVGIconProps} from '../SVGIcon';

export const AppleIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={32} realHeight={32} {...props}>
    <path
      d="M24.716 17.018c.041 4.845 4.233 6.447 4.284 6.464-.025.113-.656 2.312-2.228 4.545-1.313 1.965-2.689 3.887-4.873 3.922-2.122.049-2.836-1.25-5.27-1.25-2.457 0-3.217 1.215-5.252 1.299-2.081.077-3.67-2.098-5.031-4.046-2.72-3.978-4.837-11.21-1.998-16.13 1.375-2.413 3.883-3.967 6.564-4.009 2.083-.042 4.016 1.409 5.296 1.409 1.255 0 3.645-1.736 6.11-1.476 1.03.03 3.964.407 5.857 3.17-.153.092-3.495 2.059-3.459 6.102zM20.707 5.129c-1.142 1.35-2.97 2.382-4.75 2.249-.233-1.821.67-3.758 1.679-4.94C18.777 1.098 20.759.07 22.343 0c.208 1.893-.54 3.758-1.636 5.129z"
      fillRule="evenodd"
    />
  </SVGIcon>
);
