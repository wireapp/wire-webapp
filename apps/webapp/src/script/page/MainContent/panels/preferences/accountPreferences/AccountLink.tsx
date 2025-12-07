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

import * as Icon from 'Components/Icon';
import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

interface AccountLinkProps {
  'data-uie-name'?: string;
  label: string;
  value: string;
}

const AccountLink = ({label, value, ...rest}: AccountLinkProps) => {
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        css={{
          marginBottom: 8,
        }}
      >
        <label
          className="label preferences-label"
          css={{
            alignItems: 'center',
            color: 'inherit',
            display: 'flex',
            height: 32,
          }}
          data-uie-name="label-profile-link"
        >
          {label}
        </label>

        <p data-uie-name="profile-link" data-uie-value={value} {...rest}>
          {value}
        </p>
      </div>
      <div
        css={{
          marginTop: 8,
        }}
      >
        <Button
          variant={ButtonVariant.TERTIARY}
          type="button"
          role="button"
          data-uie-name="do-copy-profile-link"
          onClick={() => copyText(value)}
          className="text-bold-small"
        >
          <Icon.CopyIcon width="16" height="16" css={{marginRight: '8px'}} />
          {t('preferencesAccountCopyLink')}
        </Button>
      </div>
    </div>
  );
};

export {AccountLink};
