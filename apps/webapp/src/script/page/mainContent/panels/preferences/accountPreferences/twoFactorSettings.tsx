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

import {useEffect, useState} from 'react';

import type {TotpCredential} from '@wireapp/api-client/lib/self/totp';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {AuthenticatorApps} from 'Components/twoFactor/authenticatorApps';
import {RecoveryCodeGeneration} from 'Components/twoFactor/recoveryCodeGeneration';
import {twoFactorStyles} from 'Components/twoFactor/twoFactor.styles';
import {
  activeCredentials,
  createTwoFactorApi,
  type TwoFactorApi,
  twoFactorError,
} from 'Components/twoFactor/twoFactorApi';
import {TwoFactorEnrollment} from 'Components/twoFactor/twoFactorEnrollment';
import {TwoFactorModal} from 'Components/twoFactor/twoFactorModal';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {APIClient} from 'src/script/service/apiClientSingleton';

interface Props {
  email: string;
  api?: TwoFactorApi;
  enforced?: boolean;
}

export function TwoFactorSettings({email, api: providedApi, enforced = false}: Props) {
  const {translate, clock} = useApplicationContext();
  const [api] = useState(() => {
    return providedApi ?? createTwoFactorApi(container.resolve(APIClient).transport.http, clock);
  });
  const [credentials, setCredentials] = useState<Maybe<TotpCredential[]>>(Maybe.nothing());
  const [flow, setFlow] = useState<'closed' | 'enrol' | 'apps' | 'disable' | 'recovery'>('closed');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [canClose, setCanClose] = useState(true);

  useEffect(() => {
    let active = true;
    setError('');
    void api.list().then(response => {
      if (!active) {
        return;
      }
      if (response.isErr) {
        setError(twoFactorError(response.error, translate));
        return;
      }
      setCredentials(Maybe.just(activeCredentials(response.value)));
    });
    return () => {
      active = false;
    };
  }, [api, retry, translate]);

  const apps = credentials.unwrapOr([]);
  const enabled = apps.length > 0;
  const enabledLabel = translate(enforced ? 'preferencesSecurityRequired' : 'preferencesSecurityOn');
  const close = () => {
    setFlow('closed');
    setCanClose(true);
  };
  return (
    <div css={twoFactorStyles}>
      {credentials.isNothing ? (
        <>
          {error === '' ? (
            <p role="status">{translate('preferencesSecurityPleaseWait')}</p>
          ) : (
            <>
              <p role="alert">{error}</p>
              <Button
                onClick={() => {
                  return setRetry(retry + 1);
                }}
              >
                {translate('preferencesSecurityRetry')}
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="two-factor-row">
            <div>
              <strong>{translate('preferencesSecurityTwoFactorAuthentication')}</strong>
              <small>{translate('preferencesSecurityDescription')}</small>
            </div>
            <span className={`two-factor-status${enabled ? ' two-factor-status--on' : ' two-factor-status--off'}`}>
              {enabled ? enabledLabel : translate('preferencesSecurityOff')}
            </span>
            {(!enabled || !enforced) && (
              <Button
                variant={ButtonVariant.TERTIARY}
                onClick={() => {
                  return setFlow(enabled ? 'disable' : 'enrol');
                }}
              >
                {translate(enabled ? 'preferencesSecurityTurnOff' : 'preferencesSecuritySetUp')}
              </Button>
            )}
          </div>
          {enabled && (
            <>
              {enforced && <p>{translate('preferencesSecurityEnforcedDetail')}</p>}
              <div className="two-factor-row">
                <div>
                  <strong>{translate('preferencesSecurityAuthenticatorApps')}</strong>
                  <small>{translate('preferencesSecurityAppCount', {count: apps.length})}</small>
                </div>
                <Button
                  variant={ButtonVariant.TERTIARY}
                  onClick={() => {
                    return setFlow('apps');
                  }}
                >
                  {translate('preferencesSecurityManage')}
                </Button>
              </div>
              <div className="two-factor-row">
                <div>
                  <strong>{translate('preferencesSecurityRecoveryCodes')}</strong>
                  <small>{translate('preferencesSecurityCodesShownOnce')}</small>
                </div>
                <Button
                  variant={ButtonVariant.TERTIARY}
                  onClick={() => {
                    return setFlow('recovery');
                  }}
                >
                  {translate('preferencesSecurityGenerateNewCodes')}
                </Button>
              </div>
            </>
          )}
        </>
      )}
      {flow !== 'closed' && (
        <TwoFactorModal onClose={close} canClose={canClose}>
          {flow === 'enrol' && (
            <TwoFactorEnrollment
              api={api}
              email={email}
              adding={enabled}
              onCancel={close}
              onCloseAllowedChange={setCanClose}
              onComplete={credential => {
                setCredentials(Maybe.just([...apps, credential]));
                close();
              }}
            />
          )}
          {(flow === 'apps' || flow === 'disable') && (
            <AuthenticatorApps
              onCloseAllowedChange={setCanClose}
              api={api}
              credentials={apps}
              turnOff={flow === 'disable'}
              onChange={value => {
                return setCredentials(Maybe.just(value));
              }}
              onAdd={() => {
                return setFlow('enrol');
              }}
              onClose={close}
            />
          )}
          {flow === 'recovery' && <RecoveryCodeGeneration onClose={close} onCloseAllowedChange={setCanClose} />}
        </TwoFactorModal>
      )}
    </div>
  );
}
