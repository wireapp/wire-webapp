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

import {Button, ButtonVariant, DownloadIcon} from '@wireapp/react-ui-kit';

import {CopyIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {downloadBlob} from 'Util/util';

export function RecoveryCodes({codes, onCopy}: {codes: string[]; onCopy: (text: string) => void}) {
  const {translate} = useApplicationContext();
  const text = `${translate('preferencesSecurityRecoveryFileHeading')}\n\n${codes.join('\n')}\n`;
  return (
    <>
      <p>{translate('preferencesSecurityRecoveryCodesDetail')}</p>
      <ul className="two-factor-codes">
        {codes.map(code => {
          return <li key={code}>{code}</li>;
        })}
      </ul>
      <div className="two-factor-actions">
        <Button
          type="button"
          variant={ButtonVariant.SECONDARY}
          onClick={() => {
            downloadBlob(new Blob([text], {type: 'text/plain;charset=utf-8'}), 'wire-recovery-codes.txt');
          }}
        >
          <DownloadIcon aria-hidden="true" />
          {translate('preferencesSecurityDownload')}
        </Button>
        <Button
          type="button"
          variant={ButtonVariant.SECONDARY}
          onClick={() => {
            return onCopy(text);
          }}
        >
          <CopyIcon aria-hidden="true" />
          {translate('preferencesSecurityCopy')}
        </Button>
      </div>
    </>
  );
}
