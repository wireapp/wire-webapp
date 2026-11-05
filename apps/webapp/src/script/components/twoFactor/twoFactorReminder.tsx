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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {ShieldIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatDateNumeral} from 'Util/timeUtil';

interface Props {
  isAdmin: boolean;
  daysLeft: number;
  deadline: string;
  onDismiss: () => void;
  onSetup: () => void;
}

export function TwoFactorReminder({isAdmin, daysLeft, deadline, onDismiss, onSetup}: Props) {
  const {translate} = useApplicationContext();
  return (
    <section
      aria-label={translate('preferencesSecurityTwoFactorAuthentication')}
      css={{
        margin: '0 12px 12px',
        padding: 12,
        borderRadius: 12,
        background: 'var(--accent-color-highlight, #e8f2ff)',
        color: 'var(--main-color, #17181a)',
      }}
    >
      <div css={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
        <ShieldIcon css={{flexShrink: 0, marginTop: 3, color: 'var(--accent-color)', path: {fill: 'currentColor'}}} />
        <p css={{margin: 0, fontSize: 14, lineHeight: '20px'}}>
          {translate(isAdmin ? 'preferencesSecurityAdminReminder' : 'preferencesSecurityMemberReminder', {
            days: daysLeft,
            deadline: formatDateNumeral(deadline),
          })}
        </p>
      </div>
      <div
        css={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          button: {
            flex: 1,
            minWidth: 0,
            margin: 0,
            whiteSpace: 'normal',
            minHeight: 32,
            height: 'auto',
            lineHeight: '20px',
            padding: '5px 12px',
            fontSize: 13,
            borderRadius: 8,
          },
        }}
      >
        <Button variant={ButtonVariant.SECONDARY} onClick={onDismiss}>
          {translate('preferencesSecurityDismiss')}
        </Button>
        <Button onClick={onSetup}>{translate('preferencesSecuritySetUpNow')}</Button>
      </div>
    </section>
  );
}
