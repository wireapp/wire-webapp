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

export const MicrosoftIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={32} realHeight={32} {...props}>
    <path
      d="M14.659 2.511A1280.2 1280.2 0 0 1 31.996 0c.004 5.056 0 10.107.004 15.163-5.78.022-11.558.11-17.341.128-.004-4.262-.004-8.521 0-12.78zM0 4.551c4.346-.669 8.71-1.246 13.076-1.791.003 4.193.003 8.382.007 12.575-4.361-.004-8.722.062-13.083.05V4.552zm0 12.155c4.357-.015 8.715.054 13.072.047 0 4.204.01 8.408.004 12.611C8.722 28.721 4.36 28.158 0 27.57V16.706zm14.633.168h17.363c.008 5.04 0 10.081 0 15.126a1259.017 1259.017 0 0 0-17.337-2.446c-.008-4.225-.019-8.451-.026-12.68z"
      fillRule="evenodd"
    />
  </SVGIcon>
);
