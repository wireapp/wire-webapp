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

import {CSSObject} from '@emotion/react';

export const channelSettingsTextCss: CSSObject = {
  margin: '6px 0px',
  fontSize: 'var(--font-size-small)',
};

export const customHistorySharingOptionContainerCss: CSSObject = {
  justifyContent: 'space-between',
};

export const customHistorySharingOptionLeftSectionCss: CSSObject = {
  gap: '0.5rem',
};

export const customHistorySharingOptionIconCss: CSSObject = {
  height: '24px',
  width: '9px',
};

export const upgradeBadgeCss: CSSObject = {
  textTransform: 'uppercase',
  padding: '0px 6px',
  background: 'var(--accent-color)',
  color: 'var(--app-bg-secondary)',
  borderRadius: '4px',
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 'var(--font-weight-bold)',
  border: '1px solid var(--app-bg-secondary)',
};

export const salesModalWrapperCss: CSSObject = {
  backgroundPosition: 'right',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'contain',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='153' height='204' viewBox='0 0 153 204' fill='none' xmlns='http%3A//www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_7387_32693)'%3E%3Cpath d='M-203.221 545.269C-72.9993 577.345 -37.9369 532.145 -98.0343 409.667C-158.132 287.189 -123.069 241.989 7.15273 274.065C137.375 306.142 172.437 260.941 112.34 138.464C52.2424 15.9859 87.3047 -29.2146 217.527 2.86203C347.749 34.9387 382.811 -10.2619 322.714 -132.74' stroke='%2354A6FF' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M68.4907 142C135.042 154.069 151.853 129.935 118.922 69.6C85.9922 9.26459 102.803 -14.8688 169.354 -2.80004C235.905 9.26868 252.716 -14.8646 219.786 -75.2C186.856 -135.535 203.666 -159.669 270.218 -147.6C336.769 -135.531 353.579 -159.665 320.649 -220M-133 431.982C-66.4487 444.051 -49.6381 419.918 -82.5683 359.582C-115.498 299.247 -98.6878 275.114 -32.1366 287.182C34.4147 299.251 51.2253 275.118 18.2952 214.783C-14.635 154.447 2.17562 130.314 68.7269 142.382C135.278 154.451 152.089 130.318 119.159 69.9825' stroke='%2330DB5B' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M92 -184.791C12 -143.72 12 -100.864 92 -56.2219C172 -11.5802 172 31.2762 92 72.3474C12 113.419 12 156.275 92 200.917C172 245.558 172 288.415 92 329.486C12 370.557 12 413.414 92 458.055' stroke='%23DA8FFF' stroke-linecap='round'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_7387_32693'%3E%3Crect width='153' height='204' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E")`,
  borderRadius: '10px',
  width: '390px',
  backgroundColor: 'var(--black)',
};

export const salesModalBodyCss: CSSObject = {
  display: 'flex',
  padding: '24px',
  flexDirection: 'column',
};

export const salesModalBodyWrapperCss: CSSObject = {
  maxWidth: '66%',
};

export const salesModalBodyHeaderCss: CSSObject = {
  color: 'var(--white)',
};

export const salesModalBodyTextCss: CSSObject = {
  margin: '0.5rem 0',
  color: 'var(--white)',
};

export const salesModalBodyButtonCss: CSSObject = {
  margin: 0,
  width: 'fit-content',
  backgroundColor: 'var(--gray-90)',
  marginTop: '1rem',
  color: 'var(--white)',
};

export const groupsNotAllowedSectionCss: CSSObject = {
  marginTop: '35%',
  textAlign: 'center',
};
