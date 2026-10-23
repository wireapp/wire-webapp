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

import {NeutralStatusIcon} from './neutralStatusIcon';
import {statusIconStyles, statusStyles} from './troubleshooting.styles';

type StatusTone = 'good' | 'warning' | 'bad' | 'muted';

const statusPaths = {
  good: (
    <>
      <path
        d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z"
        fill="#1D7833"
      />
      <path
        d="M6 10.4001L8.7 13.1001L14.2 7.6001"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="white"
      />
    </>
  ),
  bad: (
    <>
      <path
        d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z"
        fill="#C20013"
      />
      <path d="M7 7L10 10M10 10L13 13M10 10L13 7M10 10L7 13" strokeWidth="2" strokeLinecap="round" stroke="white" />
    </>
  ),
  warning: (
    <>
      <path
        d="M8.70023 2.29999C8.83175 2.07151 9.02117 1.88173 9.2494 1.74977C9.47762 1.61781 9.7366 1.54832 10.0002 1.54832C10.2639 1.54832 10.5228 1.61781 10.7511 1.74977C10.9793 1.88173 11.1687 2.07151 11.3002 2.29999L18.9002 15.8C19.0198 16.0266 19.0794 16.2801 19.0733 16.5362C19.0671 16.7924 18.9955 17.0427 18.8651 17.2633C18.7347 17.4839 18.55 17.6675 18.3286 17.7964C18.1072 17.9254 17.8564 17.9955 17.6002 18H2.40023C2.14403 17.9955 1.89327 17.9254 1.67184 17.7964C1.45042 17.6675 1.26572 17.4839 1.13537 17.2633C1.00501 17.0427 0.933341 16.7924 0.92719 16.5362C0.921039 16.2801 0.980613 16.0266 1.10023 15.8L8.70023 2.29999Z"
        fill="#A25915"
      />
      <path d="M10 7.2V11.8" strokeWidth="2" strokeLinecap="round" stroke="white" />
      <path
        d="M9.9999 15.7C10.6074 15.7 11.0999 15.2075 11.0999 14.6C11.0999 13.9925 10.6074 13.5 9.9999 13.5C9.39239 13.5 8.8999 13.9925 8.8999 14.6C8.8999 15.2075 9.39239 15.7 9.9999 15.7Z"
        fill="white"
      />
    </>
  ),
};

export const DiagnosticStatusIcon = ({tone}: {tone: StatusTone}) => {
  return (
    <span css={[statusStyles(tone), statusIconStyles]} aria-hidden="true">
      {tone === 'muted' ? (
        <NeutralStatusIcon />
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          {statusPaths[tone]}
        </svg>
      )}
    </span>
  );
};
