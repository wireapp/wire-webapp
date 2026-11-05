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

import {ShieldIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';

export function RecoveryCodeReminder({codesLeft}: {codesLeft: number}) {
  const {translate} = useApplicationContext();
  return (
    <section
      aria-label={translate('preferencesSecurityRecoveryCodes')}
      css={{
        margin: '0 12px 12px',
        padding: 12,
        borderRadius: 12,
        background: 'var(--accent-color-highlight, #e8f2ff)',
        color: '#17181a',
      }}
    >
      <div css={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
        <ShieldIcon css={{flexShrink: 0, marginTop: 3, color: 'var(--accent-color)', path: {fill: 'currentColor'}}} />
        <p css={{margin: 0, fontSize: 14, lineHeight: '20px'}}>
          {translate('preferencesSecurityRecoveryUsedReminder', {count: codesLeft})}
        </p>
      </div>
    </section>
  );
}
