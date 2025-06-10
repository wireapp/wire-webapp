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

export const ChromeIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={32} realHeight={32} {...props}>
    <path
      d="M11.756 11.758a6 6 0 1 0 8.486 8.484 5.997 5.997 0 0 0 0-8.484 6 6 0 0 0-8.486 0M27.68 5.065l-6.022 6.025a7.492 7.492 0 0 1-.355 10.213 7.464 7.464 0 0 1-2.859 1.78l2.204 8.227c5.267-1.605 9.385-5.842 10.813-11.169 1.426-5.327-.022-11.055-3.78-15.076M10.694 21.303a7.496 7.496 0 0 1-2.059-6.732L.423 12.37A15.896 15.896 0 0 0 2.12 23.95a15.885 15.885 0 0 0 9.743 7.504c2.542.684 5.22.726 7.776.127l-2.202-8.219a7.494 7.494 0 0 1-6.742-2.058m0-10.606c2.806-2.805 7.273-2.917 10.221-.349l6.023-6.026A16.013 16.013 0 0 0 20.15.547C11.791-1.69 3.186 3.138.695 11.354l8.22 2.203a7.452 7.452 0 0 1 1.78-2.86"
      fillRule="evenodd"
    />
  </SVGIcon>
);
