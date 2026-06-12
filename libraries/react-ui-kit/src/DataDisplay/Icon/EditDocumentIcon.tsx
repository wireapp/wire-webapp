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

export const EditDocumentIcon = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={12} realHeight={12} {...props}>
    <path
      fillRule="evenodd"
      d="M8.25 10.501v-2.25l1.5-1.5V12H0V0h9L7.5 1.5h-6v9.001h6.75zm3.208-7.934l-1.274-1.274.28-.28a.896.896 0 011.271.003.9.9 0 01.003 1.272l-.28.28zM6.093 7.932L4.5 8.251l.319-1.593 5.1-5.1 1.274 1.275-5.1 5.1z"
    />
  </SVGIcon>
);
