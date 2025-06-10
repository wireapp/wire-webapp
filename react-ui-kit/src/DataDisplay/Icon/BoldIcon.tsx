/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const BoldIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M3 15V1H8.37405C9.73738 1.0128 10.7615 1.35848 11.4463 2.03704C12.1375 2.722 12.4831 3.62779 12.4831 4.75446C12.4957 5.33059 12.3594 5.88111 12.0741 6.40604C11.9282 6.65569 11.719 6.89255 11.4463 7.1166C11.1736 7.35345 10.8376 7.5679 10.4381 7.75994V7.79835C11.1927 7.9968 11.7633 8.39689 12.1501 8.99863C12.5116 9.61957 12.6923 10.2949 12.6923 11.0247C12.6796 12.2346 12.3055 13.1916 11.5699 13.8957C10.8407 14.6319 9.93078 15 8.84011 15H3ZM8.336 8.7139H5.10206V12.88H8.336C9.11595 12.8673 9.68664 12.6549 10.0481 12.2427C10.4095 11.8369 10.5902 11.355 10.5902 10.7969C10.5902 10.2262 10.4095 9.73798 10.0481 9.33215C9.68664 8.93266 9.11595 8.72658 8.336 8.7139ZM8.13626 2.87378H5.10206V6.84011H8.13626C8.90353 6.84011 9.46788 6.64037 9.82932 6.24088C10.1971 5.8731 10.381 5.41021 10.381 4.85219C10.381 4.29418 10.1971 3.82177 9.82932 3.43497C9.46788 3.07352 8.90353 2.88646 8.13626 2.87378Z" />
  </SVGIcon>
);
