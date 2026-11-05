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

import {useRef, useState} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import type {TotpCredential} from '@wireapp/api-client/lib/self/totp';
import {Maybe} from 'true-myth';

import {Button, ButtonVariant, CodeInput, Input, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatDateNumeral} from 'Util/timeUtil';

import {type TwoFactorApi, twoFactorError} from './twoFactorApi';

const codeLength = 6;

interface Props {
  api: TwoFactorApi;
  credentials: TotpCredential[];
  onChange: (credentials: TotpCredential[]) => void;
  onAdd: () => void;
  onClose: () => void;
  turnOff?: boolean;
  onCloseAllowedChange: (allowed: boolean) => void;
}

export function AuthenticatorApps({
  api,
  credentials,
  onChange,
  onAdd,
  onClose,
  turnOff = false,
  onCloseAllowedChange,
}: Props) {
  const {translate} = useApplicationContext();
  const [selected, setSelected] = useState<Maybe<TotpCredential>>(
    turnOff && credentials.length === 1 ? Maybe.of(credentials[0]) : Maybe.nothing(),
  );
  const [removing, setRemoving] = useState(turnOff && credentials.length === 1);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submit = async () => {
    if (selected.isNothing || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    onCloseAllowedChange(false);
    const id = selected.value.id;
    const response = removing
      ? await api.remove(id, {password, totp_code: `totp:${code}`})
      : await api.rename(id, name.trim());
    inFlight.current = false;
    setBusy(false);
    onCloseAllowedChange(true);
    if (response.isErr) {
      setError(twoFactorError(response.error, translate));
      return;
    }
    onChange(
      removing
        ? credentials.filter(credential => {
            return credential.id !== id;
          })
        : credentials.map(credential => {
            return credential.id === id ? {...credential, name: name.trim()} : credential;
          }),
    );
    setPassword('');
    setCode('');
    setSelected(Maybe.nothing());
    setRemoving(false);
    if (turnOff) {
      onClose();
    }
  };
  let heading = translate('preferencesSecurityEditApp');
  let submitLabel = translate('preferencesSecuritySave');
  if (removing) {
    heading = translate(turnOff ? 'preferencesSecurityDisableConfirmation' : 'preferencesSecurityRemoveApp');
    submitLabel = translate(turnOff ? 'preferencesSecurityTurnOff' : 'preferencesSecurityRemove');
  }
  if (busy) {
    submitLabel = translate('preferencesSecurityPleaseWait');
  }
  return (
    <div className="two-factor-dialog" aria-busy={busy}>
      {selected.isNothing ? (
        <>
          <h2>{translate('preferencesSecurityAuthenticatorApps')}</h2>
          <p>{translate(turnOff ? 'preferencesSecurityRemoveExtraApps' : 'preferencesSecurityAppsDetail')}</p>
          {credentials.map((credential, index) => {
            const appName = isNonEmptyString(credential.name) ? credential.name.trim() : '';
            const displayName = isNonEmptyString(appName)
              ? appName
              : translate('preferencesSecurityUnnamedApp', {index: index + 1});
            return (
              <div className="two-factor-row" key={credential.id}>
                <div>
                  <strong>{displayName}</strong>
                  <small>
                    {translate('preferencesSecurityAppAdded', {date: formatDateNumeral(credential.created_at)})}
                  </small>
                </div>
                <Button
                  variant={ButtonVariant.TERTIARY}
                  onClick={() => {
                    setSelected(Maybe.just(credential));
                    setName(displayName);
                  }}
                >
                  {translate('preferencesSecurityEdit')}
                </Button>
              </div>
            );
          })}
          {credentials.length === 1 && <p style={{marginTop: 14}}>{translate('preferencesSecurityOnlyApp')}</p>}
          <div className="two-factor-footer">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              {translate('preferencesSecurityDone')}
            </Button>
            <Button onClick={onAdd}>{translate('preferencesSecurityAddApp')}</Button>
          </div>
        </>
      ) : (
        <>
          <h2>{heading}</h2>
          {removing ? (
            <>
              <p>{translate('preferencesSecurityDisableDetail')}</p>
              <Input
                id="two-factor-password"
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
              <CodeInput
                codeInputLabel={translate('preferencesSecurityAuthenticationCode')}
                codePlaceholder={translate('preferencesSecurityDigit')}
                digits={codeLength}
                onCodeChange={setCode}
                markInvalid={error !== ''}
              />
            </>
          ) : (
            <>
              <Input
                id="two-factor-app-name"
                label={translate('preferencesSecurityAppName')}
                value={name}
                onChange={event => {
                  return setName(event.target.value);
                }}
              />
              <p>{translate('preferencesSecurityAppNameDetail')}</p>
              {credentials.length > 1 ? (
                <Link
                  variant={LinkVariant.PRIMARY}
                  href="#remove-app"
                  onClick={event => {
                    event.preventDefault();
                    setRemoving(true);
                    setError('');
                  }}
                >
                  {translate('preferencesSecurityRemoveApp')}
                </Link>
              ) : (
                <p style={{marginTop: 14}}>{translate('preferencesSecurityOnlyApp')}</p>
              )}
            </>
          )}
          <div className="two-factor-footer">
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={busy}
              onClick={() => {
                if (turnOff) {
                  onClose();
                } else {
                  setSelected(Maybe.nothing());
                  setRemoving(false);
                  setPassword('');
                  setCode('');
                  setError('');
                }
              }}
            >
              {translate('preferencesSecurityCancel')}
            </Button>
            <Button
              disabled={busy || (removing ? password === '' || code.length !== codeLength : name.trim() === '')}
              onClick={submit}
            >
              {submitLabel}
            </Button>
          </div>
        </>
      )}
      {error !== '' && (
        <p role="alert" className="two-factor-error">
          {error}
        </p>
      )}
    </div>
  );
}
