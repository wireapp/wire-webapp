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

export const PdfFileIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={13} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--pdf-file-icon-bg)"
        stroke="var(--pdf-file-icon-stroke)"
        d="M1 2.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9.006a2.5 2.5 0 0 1-.719 1.754l-1.47 1.494a2.5 2.5 0 0 1-1.782.746H3a2 2 0 0 1-2-2v-11Z"
      />
      <path stroke="var(--pdf-file-icon-stroke)" d="M13 11.5a4 4 0 0 0-4 4" />
      <path
        fill="var(--pdf-file-icon-stroke)"
        d="M3.231 11.17a.985.985 0 0 0 .746.33 1.88 1.88 0 0 0 1.077-.406c.329-.24.69-.884 1.038-1.756a24.574 24.574 0 0 1 1.705-.415c.57.573 1.293.967 2.082 1.135a1.025 1.025 0 0 0 .962-.433.966.966 0 0 0 .043-.99c-.135-.254-.502-.683-1.458-.69-.467.02-.931.074-1.39.162A5.57 5.57 0 0 1 7.018 6.58c.125-.415.247-.844.368-1.277l.125-.429A2.32 2.32 0 0 0 7.6 3.94c-.099-.696-.546-.967-.933-.937-.49.043-.963.551-.917 1.442.033.74.188 1.47.46 2.159a37.817 37.817 0 0 1-.693 2.092c-.985.307-1.852.66-2.158.99a1.094 1.094 0 0 0-.128 1.485Zm6.191-2.475c.598 0 .76.221.795.287a.195.195 0 0 1 0 .208.272.272 0 0 1-.266.099 2.727 2.727 0 0 1-1.179-.545c.215-.03.43-.046.647-.05h.003Zm-2.69-4.95c.017 0 .09.062.115.264.02.211-.002.424-.065.627l-.125.439c-.016.06-.036.122-.053.184a6.487 6.487 0 0 1-.088-.851c-.033-.445.138-.643.213-.65l.004-.013Zm-.029 3.848c.147.237.31.464.486.68-.256.056-.516.118-.775.184.102-.277.19-.567.289-.864Zm-2.792 2.623a3.815 3.815 0 0 1 1.238-.594 2.344 2.344 0 0 1-.535.845c-.453.33-.736.3-.818.205-.082-.096-.049-.278.115-.46v.004Z"
      />
    </SVGIcon>
  );
};
