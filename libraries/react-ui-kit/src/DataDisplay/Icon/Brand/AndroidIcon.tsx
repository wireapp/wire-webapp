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

export const AndroidIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={32} realHeight={32} {...props}>
    <path
      d="M4.04 10.35c-1.133 0-2.04.886-2.04 1.971v8.268c0 1.094.916 1.971 2.04 1.971 1.131 0 2.038-.886 2.038-1.971V12.32c0-1.085-.916-1.971-2.039-1.971zm16.465-7.425L21.933.406a.276.276 0 0 0-.108-.373c-.134-.07-.314-.026-.386.112L20.002 2.69a10.133 10.133 0 0 0-4.006-.816 10.04 10.04 0 0 0-3.989.807L10.57.145a.297.297 0 0 0-.386-.112.277.277 0 0 0-.117.373l1.428 2.519C8.692 4.323 6.797 6.98 6.797 10.037h18.397c0-3.057-1.886-5.714-4.689-7.112zm-8.696 3.89a.76.76 0 0 1-.772-.747.76.76 0 0 1 .772-.747c.423 0 .773.34.773.747a.754.754 0 0 1-.773.747zm8.382 0a.76.76 0 0 1-.773-.747.76.76 0 0 1 .773-.747c.422 0 .772.34.772.747a.772.772 0 0 1-.772.747zM6.869 10.723v12.818c0 1.164.97 2.11 2.183 2.11h1.482v4.378c0 1.085.916 1.971 2.039 1.971 1.132 0 2.04-.886 2.04-1.98v-4.377h2.757v4.377c0 1.086.916 1.971 2.039 1.971 1.132 0 2.04-.885 2.04-1.971v-4.377h1.49c1.204 0 2.183-.938 2.183-2.11V10.714l-18.253.01zM30 12.321c0-1.094-.916-1.971-2.04-1.971-1.131 0-2.038.886-2.038 1.971v8.268c0 1.094.916 1.971 2.039 1.971 1.132 0 2.039-.886 2.039-1.971V12.32z"
      fillRule="evenodd"
    />
  </SVGIcon>
);
