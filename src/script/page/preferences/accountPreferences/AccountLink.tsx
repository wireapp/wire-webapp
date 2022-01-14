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
import {CopyIcon} from '@wireapp/react-ui-kit';
import {t} from 'Util/LocalizerUtil';

interface AccountLinkProps extends React.InputHTMLAttributes<HTMLInputElement> {
  allowedChars?: string;
  'data-uie-name'?: string;
  forceLowerCase?: boolean;
  isDone?: boolean;
  label: string;
  labelUie?: string;
  maxLength?: number;
  onValueChange?: (value: string) => void;
  prefix?: string;
  readOnly?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
  suffix?: string;
  value: string;
  valueUie?: string;
}

const AccountLink: React.FC<AccountLinkProps> = ({
  label,
  value,
  readOnly,
  onValueChange,
  isDone = false,
  prefix,
  suffix,
  setIsEditing: setIsEditingExternal,
  forceLowerCase = false,
  maxLength,
  allowedChars,
  labelUie,
  valueUie,
  ...rest
}) => {
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
      <button onClick={() => value}>
        <CopyIcon height={16} width={16} color="black" /> {t('preferencesAccountCopyLink')}
      </button>
    </div>
  );
};

export default AccountLink;
