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

type ThreadIconProps = React.SVGProps<SVGSVGElement>;

export const ThreadsIcon = (props: ThreadIconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M2.09262 0H10.393C11.4243 0.07 12.4255 0.79 12.5257 1.87V6.94C12.3955 8.07 11.3742 8.75 10.2929 8.8H4.60576C3.35419 8.87 2.31289 10.05 1.27159 10.68C0.770964 10.98 0.100125 10.8 0 10.19V1.97C0.0400501 0.85 1.03129 0.09 2.09262 0Z"
        fill="currentColor"
      />
      <path
        d="M3.47439 11.57C3.59454 11.18 3.93496 10.98 4.62583 10.83C4.85611 10.78 8.37051 10.9 10.2228 10.83C12.0751 10.76 13.8474 9.69005 14.368 7.84005C14.6083 7.01005 14.4982 6.15005 14.5182 5.30005C15.3192 5.55005 15.97 6.28005 16 7.14005V15.34C15.8999 16 15.2091 16.17 14.6884 15.84C13.6571 15.19 12.7059 14.13 11.4544 13.99C9.59203 13.93 7.66963 14.08 5.81732 13.99C5.09641 13.96 4.41556 13.73 3.92495 13.18C3.52445 12.72 3.27414 12.2 3.46437 11.58L3.47439 11.57Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const ThreadsOutlineIcon = (props: ThreadIconProps) => {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" aria-hidden="true" {...props}>
      <path
        d="M12.46 7.17004H12.5H13.79C13.89 7.19004 13.97 7.23004 13.99 7.23004V12.87C13.3 12.42 12.49 12.04 11.51 11.98H11.45H11.39H6.78C6.62 11.97 6.52 11.91 6.48 11.9V8.79004C6.94 8.79004 7.48 8.80004 8.01 8.81004C8.58 8.82004 9.14 8.83004 9.58 8.83004C10.4 8.83004 11.11 8.83004 11.74 8.31004C12.11 8.00004 12.33 7.63004 12.45 7.16004M10.51 5.17004C10.51 5.17004 10.65 6.63004 10.48 6.78004C10.42 6.83004 10.08 6.84004 9.6 6.84004C8.72 6.84004 7.37 6.79004 6.41 6.79004C5.76 6.79004 5.28 6.81004 5.24 6.89004C5.24 6.91004 4.5 7.03004 4.5 7.05004V12.12C4.63 13.25 5.65 13.93 6.73 13.98H11.41C12.66 14.05 13.7 15.23 14.74 15.86C14.9 15.96 15.08 16 15.25 16C15.61 16 15.94 15.78 16.01 15.36V7.13004C15.96 6.02004 14.97 5.25004 13.91 5.17004H12.51H10.51Z"
        fill="currentColor"
      />
      <path
        d="M10.28 2C10.38 2.02 10.46 2.06 10.51 2.09V6.72C10.51 6.72 10.36 6.8 10.21 6.82H4.6H4.54H4.48C3.51 6.88 2.69 7.26 2 7.71V2.09C2 2.09 2.11 2.02 2.2 2H10.28ZM10.38 0H2.1C1.04 0.09 0.05 0.85 0 1.97V10.2C0.07 10.62 0.4 10.84 0.76 10.84C0.93 10.84 1.11 10.79 1.27 10.7C2.3 10.08 3.34 8.89 4.6 8.82H10.28C11.36 8.77 12.38 8.09 12.51 6.96V1.88C12.42 0.8 11.41 0.08 10.38 0Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const ThreadsThinOutlineIcon = (props: ThreadIconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M12.55 6.67004H13.83C14.14 6.71004 14.47 6.91004 14.5 7.18004V13.84C13.7 13.23 12.72 12.55 11.49 12.48H11.45H11.41H6.77999C6.48999 12.46 6.07999 12.32 5.99999 12V8.87004L6.69999 8.84004C9.68999 8.72004 10.66 8.68004 10.86 8.66004C11.57 8.59004 12.35 8.16004 12.57 6.67004M11.09 5.17004C11.09 5.17004 11.25 7.11004 10.7 7.17004C10.41 7.20004 6.21999 7.36004 5.39999 7.40004C5.37999 7.40004 4.48999 7.59004 4.48999 7.61004V12.12C4.61999 13.25 5.63999 13.93 6.71999 13.98H11.4C12.65 14.05 13.69 15.23 14.73 15.86C14.89 15.96 15.07 16 15.24 16C15.6 16 15.93 15.78 16 15.36V7.13004C15.95 6.02004 14.96 5.25004 13.9 5.17004H12.5H11.08H11.09Z"
        fill="currentColor"
      />
      <path
        d="M10.31 1.5C10.62 1.54 10.95 1.72 11 1.97V6.83C10.92 7.14 10.51 7.29 10.22 7.31H4.59H4.55H4.51C3.28 7.38 2.3 8.07 1.5 8.67V2.02C1.53 1.74 1.86 1.55 2.17 1.51H10.32M10.38 0H2.1C1.04 0.09 0.05 0.85 0 1.97V10.2C0.07 10.62 0.4 10.84 0.76 10.84C0.93 10.84 1.11 10.79 1.27 10.7C2.3 10.08 3.34 8.89 4.6 8.82H10.28C11.36 8.77 12.38 8.09 12.51 6.96V1.88C12.42 0.8 11.41 0.08 10.38 0Z"
        fill="currentColor"
      />
    </svg>
  );
};
