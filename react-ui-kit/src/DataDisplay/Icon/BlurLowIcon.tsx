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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const BlurLowIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={23} realHeight={23} viewBox="0 0 23 23" {...props} xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_3416_358)">
      <path
        d="M0.519275 11.833L0.17677 11.4905L11.4898 0.17745L11.8323 0.519954L0.519275 11.833ZM2.64254 13.9562L2.30003 13.6137L13.613 2.30071L13.9556 2.64322L2.64254 13.9562ZM4.76716 16.0795L4.42466 15.737L15.7377 4.42395L16.0802 4.76646L4.76716 16.0795ZM6.89042 18.2027L6.54792 17.8602L17.8609 6.54721L18.2034 6.88972L6.89042 18.2027ZM9.01435 20.3267L8.67185 19.9842L19.9849 8.67115L20.3274 9.01365L9.01435 20.3267ZM11.1376 22.4499L10.7951 22.1074L22.1081 10.7944L22.4506 11.1369L11.1376 22.4499Z"
        fill="black"
      />
    </g>
    <defs>
      <clipPath id="clip0_3416_358">
        <rect x="11.3137" width="16" height="16" rx="8" transform="rotate(45 11.3137 0)" fill="white" />
      </clipPath>
    </defs>
  </SVGIcon>
);
