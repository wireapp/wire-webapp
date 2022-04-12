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
import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import {copyText} from 'Util/ClipboardUtil';

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
          css={{
            color: 'var(--foreground)',
            fontSize: '12px',
            fontWeight: 'normal',
            lineHeight: '1.33',
            marginBottom: 2,
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
        css={{
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'row',
          paddingLeft: 8,
          paddingTop: 8,
        }}
      >
        <Icon.Copy css={{fill: 'var(--background)', marginRight: 8}} data-uie-name="profile-link-icon" />
        {t('preferencesAccountCopyLink')}
      </button>
    </div>
  );
};

export default AccountLink;
