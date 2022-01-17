/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

interface AccountLinkProps extends React.InputHTMLAttributes<HTMLInputElement> {
  'data-uie-name'?: string;
  label: string;
  labelUie?: string;
  value: string;
  valueUie?: string;
}

const AccountLink: React.FC<AccountLinkProps> = ({label, value, labelUie, valueUie, ...rest}) => {
  const iconUiePrefix = rest['data-uie-name'] ?? 'account-link';
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
          data-uie-name={labelUie}
        >
          {label}
        </label>

        <div data-uie-name={valueUie} data-uie-value={value} {...rest}>
          {value}
        </div>
      </div>
      <div
        role="button"
        onClick={() => copyText(value)}
        css={{
          alignItems: 'center',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'row',
          paddingLeft: '8px',
          paddingTop: '8px',
        }}
      >
        <Icon.Copy css={{fill: 'var(--background)', marginRight: '8px'}} data-uie-name={`${iconUiePrefix}-icon`} />
        {t('preferencesAccountCopyLink')}
      </div>
    </div>
  );
};

export default AccountLink;
