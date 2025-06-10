/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

export const ChannelIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={14} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.86526 1.23536C6.94346 0.766138 6.62648 0.322358 6.15725 0.244154C5.68803 0.165949 5.24425 0.482935 5.16604 0.952161L4.71178 3.67772L1.58594 3.67772C1.11024 3.67772 0.724609 4.06335 0.724609 4.53905C0.724609 5.01475 1.11024 5.40038 1.58594 5.40038H4.42467L3.9735 8.10741H1.09375C0.618052 8.10741 0.232422 8.49304 0.232422 8.96873C0.232422 9.44443 0.618052 9.83006 1.09375 9.83006H3.68639L3.19729 12.7647C3.11909 13.2339 3.43607 13.6777 3.9053 13.7559C4.37452 13.8341 4.8183 13.5171 4.89651 13.0479L5.43281 9.83006L8.11608 9.83006L7.62698 12.7647C7.54877 13.2339 7.86576 13.6777 8.33499 13.7559C8.80421 13.8341 9.24799 13.5171 9.3262 13.0479L9.8625 9.83006H12.9062C13.3819 9.83006 13.7676 9.44443 13.7676 8.96874C13.7676 8.49304 13.3819 8.10741 12.9062 8.10741H10.1496L10.6008 5.40038H13.3984C13.8741 5.40038 14.2598 5.01475 14.2598 4.53905C14.2598 4.06335 13.8741 3.67772 13.3984 3.67772L10.8879 3.67772L11.2949 1.23536C11.3732 0.766138 11.0562 0.322358 10.5869 0.244154C10.1177 0.165949 9.67393 0.482935 9.59573 0.952161L9.14147 3.67772L6.4582 3.67772L6.86526 1.23536ZM6.17109 5.40038L5.71992 8.10741L8.40319 8.10741L8.85436 5.40038L6.17109 5.40038Z"
      fill="currentColor"
    />
  </SVGIcon>
);
