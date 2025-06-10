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

export const CameraIcon = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={15} realHeight={15} {...props}>
    <path d="m4.5,2.25l0.19,-0.889c0.102,-0.475 0.58,-0.861 1.052,-0.861l3.516,0c0.479,0 0.948,0.38 1.052,0.861l0.19,0.889l2.255,0a1.75,1.75 0 0 1 1.745,1.755l0,8.74c0,0.97 -0.783,1.755 -1.745,1.755l-10.51,0a1.75,1.75 0 0 1 -1.745,-1.755l0,-8.74c0,-0.97 0.783,-1.755 1.745,-1.755l2.255,0zm3,2.25a4,4 0 1 0 0,8a4,4 0 0 0 0,-8zm0,1a3,3 0 1 1 0,6a3,3 0 0 1 0,-6z" />
  </SVGIcon>
);
