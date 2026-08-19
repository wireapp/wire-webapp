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

import {SVGIcon, SVGIconProps} from './svgIcon';

export const ViewerAccessIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} viewBox="20 8 16 16" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M35.4506 20.236C34.7419 22.3694 32.8299 23.8979 30.5824 23.8979C28.3349 23.8979 26.4229 22.3694 25.7142 20.236C26.4228 18.1025 28.3349 16.574 30.5824 16.574C32.8299 16.574 34.7419 18.1025 35.4506 20.236ZM30.5824 18.4055C31.5906 18.4055 32.408 19.2253 32.408 20.2365C32.408 21.2478 31.5906 22.0675 30.5824 22.0675C29.5742 22.0675 28.7569 21.2478 28.7569 20.2365C28.7569 19.2253 29.5742 18.4055 30.5824 18.4055Z"
    />
    <rect x="23.4286" y="12.5713" width="5.71429" height="1.14286" />
    <rect x="23.4286" y="14.8569" width="3.42857" height="1.14286" />
    <path d="M30.5 8C31.8807 8 33 9.11929 33 10.5V14.8574H31.5V10.5C31.5 9.94772 31.0523 9.5 30.5 9.5H22.5C21.9477 9.5 21.5 9.94772 21.5 10.5V21.5C21.5 22.0523 21.9477 22.5 22.5 22.5H24.5713V24H22.5C21.1193 24 20 22.8807 20 21.5V10.5C20 9.20566 20.9836 8.14082 22.2441 8.0127L22.5 8H30.5Z" />
  </SVGIcon>
);
