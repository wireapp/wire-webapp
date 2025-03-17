/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export const GroupIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={props.width || 16} realHeight={props.height || 16} {...props}>
    <path d="M3.80099 9.65917C2.81211 9.65917 1.9829 8.77845 1.9829 7.66596C1.97775 6.57408 2.81726 5.70882 3.80099 5.70882C4.78471 5.70882 5.62423 6.55863 5.62423 7.66081C5.62423 8.77845 4.78986 9.65917 3.80099 9.65917ZM0.983725 14.3512C0.26267 14.3512 0 14.0421 0 13.5014C0 12.1262 1.51422 10.442 3.80099 10.442C4.70746 10.442 5.44911 10.7047 6.01051 11.0601C4.81562 12.0077 4.24907 13.558 4.80532 14.3512H0.983725Z" />
    <path d="M9.91862 9.54277C8.78039 9.54277 7.83272 8.53329 7.82757 7.25084C7.82757 5.9993 8.78554 5.00012 9.91862 5.00012C11.0517 5.00012 12.0097 5.98385 12.0097 7.24054C12.0097 8.53329 11.0569 9.54277 9.91862 9.54277ZM6.72538 14.3481C5.84981 14.3481 5.55109 14.0751 5.55109 13.5858C5.55109 12.2622 7.24557 10.4492 9.91862 10.4492C12.5865 10.4492 14.281 12.2622 14.281 13.5858C14.281 14.0751 13.9823 14.3481 13.1067 14.3481H6.72538Z" />
    <path d="M16.199 9.65917C15.205 9.65917 14.3758 8.77845 14.3758 7.66081C14.3758 6.55863 15.2153 5.70882 16.199 5.70882C17.1827 5.70882 18.0222 6.57408 18.0171 7.66596C18.0171 8.77845 17.1879 9.65917 16.199 9.65917ZM19.0163 14.3512H15.1947C15.7509 13.558 15.1844 12.0077 13.9895 11.0601C14.5509 10.7047 15.2925 10.442 16.199 10.442C18.4858 10.442 20 12.1262 20 13.5014C20 14.0421 19.7373 14.3512 19.0163 14.3512Z" />
  </SVGIcon>
);
