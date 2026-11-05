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

import {useState} from 'react';

import {task} from 'true-myth';

import {Button, ButtonVariant, Checkbox, CheckboxLabel, Input} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {RecoveryCodes} from './recoveryCodes';

// UI preview until the backend provides recovery-code regeneration.
const previewCodes = Array.from({length: 10}, (entry, index) => {
  return `DEMO-NOT-VALID-${index + 1}`;
});

export function RecoveryCodeGeneration({
  onClose,
  onCloseAllowedChange,
}: {
  onClose: () => void;
  onCloseAllowedChange: (allowed: boolean) => void;
}) {
  const {translate} = useApplicationContext();
  const [step, setStep] = useState<'password' | 'confirm' | 'save'>('password');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const copy = async (text: string) => {
    const copied = await task.tryOrElse(
      () => {
        return 'copy-failed';
      },
      () => {
        return navigator.clipboard.writeText(text);
      },
    );
    setFeedback(translate(copied.isOk ? 'preferencesSecurityCodesCopied' : 'preferencesSecurityCopyError'));
  };
  return (
    <div className="two-factor-dialog">
      <h2>
        {translate(
          step === 'save'
            ? 'preferencesSecuritySaveNewRecoveryCodes'
            : 'preferencesSecurityGenerateNewCodesConfirmation',
        )}
      </h2>
      <p role="status">{translate('preferencesSecurityRecoveryPreview')}</p>
      {step === 'password' && (
        <Input
          id="two-factor-recovery-password"
          label={translate('preferencesSecurityPassword')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => {
            return setPassword(event.target.value);
          }}
          showTogglePasswordLabel={translate('showTogglePasswordLabel')}
          hideTogglePasswordLabel={translate('hideTogglePasswordLabel')}
        />
      )}
      {step === 'confirm' && <p>{translate('preferencesSecurityGenerateNewCodesDetail')}</p>}
      {step === 'save' && (
        <>
          <RecoveryCodes
            codes={previewCodes}
            onCopy={text => {
              void copy(text);
            }}
          />
          {feedback !== '' && <p role="status">{feedback}</p>}
          <Checkbox
            checked={saved}
            onChange={event => {
              return setSaved(event.target.checked);
            }}
          >
            <CheckboxLabel>{translate('preferencesSecuritySavedRecoveryCodes')}</CheckboxLabel>
          </Checkbox>
        </>
      )}
      <div className="two-factor-footer">
        {step !== 'save' && (
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
            {translate('preferencesSecurityCancel')}
          </Button>
        )}
        {step === 'password' && (
          <Button
            disabled={password === ''}
            onClick={() => {
              setPassword('');
              setStep('confirm');
            }}
          >
            {translate('preferencesSecurityContinue')}
          </Button>
        )}
        {step === 'confirm' && (
          <Button
            onClick={() => {
              onCloseAllowedChange(false);
              setStep('save');
            }}
          >
            {translate('preferencesSecurityGenerateNewCodes')}
          </Button>
        )}
        {step === 'save' && (
          <Button disabled={!saved} onClick={onClose}>
            {translate('preferencesSecurityDone')}
          </Button>
        )}
      </div>
    </div>
  );
}
