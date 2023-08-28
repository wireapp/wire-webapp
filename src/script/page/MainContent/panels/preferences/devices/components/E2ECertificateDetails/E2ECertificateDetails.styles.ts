/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/serialize';

import {MLSStatues} from 'Components/Badges';

const MLSStatusColor = {
  [MLSStatues.NOT_ACTIVATED]: 'var(--red-500)',
  [MLSStatues.EXPIRED]: 'var(--red-500)',
  [MLSStatues.EXPIRES_SOON]: 'var(--green-500)',
  [MLSStatues.NOT_DOWNLOADED]: 'var(--green-500)',
};

type stylesProps = {
  container: CSSObject;
  title: CSSObject;
  e2eStatusContainer: CSSObject;
  e2eStatus: (MLSStatus?: MLSStatues) => CSSObject;
  serialNumberWrapper: CSSObject;
  notAvailable: CSSObject;
  serialNumber: CSSObject;
};

export const styles: stylesProps = {
  container: {
    paddingLeft: '16px',
    borderLeft: '4px solid var(--gray-40)',
    marginTop: '12px',
  },
  title: {
    marginBottom: '6px',
  },
  e2eStatusContainer: {
    display: 'flex',
    alignItems: 'center',

    '.conversation-badges': {
      marginLeft: '4px',
    },
  },
  e2eStatus: (MLSStatus?: MLSStatues) => ({
    color: MLSStatus ? MLSStatusColor[MLSStatus] : 'var(--green-500)',
  }),
  serialNumberWrapper: {
    marginBlock: '6px',
  },
  notAvailable: {
    color: 'var(--gray-70)',
  },
  serialNumber: {
    fontFamily: 'SF Mono',
    fontSize: 'var(--font-size-medium)',
    lineHeight: 'var(--line-height-sm)',
    textTransform: 'uppercase',
    width: '217px',
  },
};
