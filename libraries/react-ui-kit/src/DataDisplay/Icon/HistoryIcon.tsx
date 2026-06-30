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

export const HistoryIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M3.00959 5.00452C4.06454 3.27662 5.96727 2.125 8.13745 2.125C11.4531 2.125 14.1409 4.81283 14.1409 8.12844C14.1409 11.444 11.4531 14.1319 8.13745 14.1319C6.04843 14.1319 4.20806 13.0656 3.13142 11.4435C2.86418 11.0409 2.32114 10.9312 1.91851 11.1984C1.51588 11.4656 1.40613 12.0087 1.67337 12.4113C3.06048 14.5011 5.43753 15.8819 8.13745 15.8819C12.4196 15.8819 15.8909 12.4105 15.8909 8.12844C15.8909 3.84633 12.4196 0.375 8.13745 0.375C5.5961 0.375 3.34155 1.59758 1.92798 3.48487V2.25C1.92798 1.83579 1.59219 1.5 1.17798 1.5C0.763765 1.5 0.427979 1.83579 0.427979 2.25V6.50452H4.67798C5.09219 6.50452 5.42798 6.16873 5.42798 5.75452C5.42798 5.3403 5.09219 5.00452 4.67798 5.00452H3.00959Z" />
    <path d="M8 4.25C8.41421 4.25 8.75 4.58579 8.75 5V8.5H10C10.4142 8.5 10.75 8.83579 10.75 9.25C10.75 9.66421 10.4142 10 10 10H8C7.58579 10 7.25 9.66421 7.25 9.25C7.25 9.20741 7.25355 9.16565 7.26037 9.125C7.25355 9.08435 7.25 9.04259 7.25 9V5C7.25 4.58579 7.58579 4.25 8 4.25Z" />
  </SVGIcon>
);
