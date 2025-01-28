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

import {SVGIcon, SVGIconProps} from '../SVGIcon';

export const FolderIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={14} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--folder-icon-bg)"
        d="M11.798 12c.318 0 .623-.124.848-.345.225-.22.352-.52.352-.832V4.941c0-.312-.127-.611-.352-.832a1.212 1.212 0 0 0-.848-.344h-4.74a1.22 1.22 0 0 1-.576-.138 1.192 1.192 0 0 1-.438-.392l-.486-.706a1.191 1.191 0 0 0-.433-.388A1.22 1.22 0 0 0 4.555 2H2.199c-.318 0-.624.124-.849.345-.225.22-.351.52-.351.831v7.647c0 .313.126.612.351.832.225.221.53.345.849.345h9.6ZM.998 6.095h12-12Z"
      />
      <path
        stroke="var(--folder-icon-stroke)"
        d="M.998 6.095h12M11.798 12c.318 0 .623-.124.848-.345.225-.22.352-.52.352-.832V4.941c0-.312-.127-.611-.352-.832a1.212 1.212 0 0 0-.848-.344h-4.74a1.22 1.22 0 0 1-.576-.138 1.192 1.192 0 0 1-.438-.392l-.486-.706a1.191 1.191 0 0 0-.433-.388A1.22 1.22 0 0 0 4.555 2H2.199c-.318 0-.624.124-.849.345-.225.22-.351.52-.351.831v7.647c0 .313.126.612.351.832.225.221.53.345.849.345h9.6Z"
      />
    </SVGIcon>
  );
};
