/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React from 'react';

import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';

interface AccountLinkProps {
  'data-uie-name'?: string;
  label: string;
  value: string;
}

const AccountLink: React.FC<AccountLinkProps> = ({label, value, ...rest}) => {
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        css={{
          backgroundColor: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 8,
          padding: 8,
          svg: {marginLeft: 8},
          width: 280,
        }}
      >
        <label
          className="label preferences-label"
          css={{
            alignItems: 'center',
            color: 'var(--text-input-label)',
            display: 'flex',
            height: 48,
          }}
          data-uie-name="label-profile-link"
        >
          {label}
        </label>

        <div data-uie-name="profile-link" data-uie-value={value} {...rest}>
          {value}
        </div>
      </div>
      <button
        type="button"
        data-uie-name="do-copy-profile-link"
        onClick={() => copyText(value)}
        className="text-bold-small"
        css={{
          '&:hover': {
            color: 'var(--accent-color)',
          },
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'row',
          marginTop: 25,
          paddingLeft: 8,
        }}
      >
        {t('preferencesAccountCopyLink')}
      </button>
    </div>
  );
};

export default AccountLink;
