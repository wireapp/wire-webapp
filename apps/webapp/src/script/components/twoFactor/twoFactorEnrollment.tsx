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

import {useEffect, useRef, useState} from 'react';

import type {TotpCredential, TotpEnrolment} from '@wireapp/api-client/lib/self/totp';
import QRCode from 'qrcode';
import {Maybe, task} from 'true-myth';

import {
  Button,
  ButtonVariant,
  Checkbox,
  CheckboxLabel,
  CodeInput,
  Input,
  Link,
  LinkVariant,
} from '@wireapp/react-ui-kit';

import {CheckIcon, CopyIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {RecoveryCodes} from './recoveryCodes';
import {type TwoFactorApi, twoFactorError} from './twoFactorApi';

export type EnrollmentStep = 'password' | 'scan' | 'key' | 'verify' | 'save';
const codeLength = 6;
const copyConfirmDuration = 1500;
const stepNumbers = {password: 0, scan: 1, key: 1, verify: 2, save: 3};
const progressSteps = ['scan', 'verify', 'save'] as const;
const stepLabels = {
  password: 'preferencesSecurityStep1',
  scan: 'preferencesSecurityStep1',
  key: 'preferencesSecurityStep1',
  verify: 'preferencesSecurityStep2',
  save: 'preferencesSecurityStep3',
} as const;

interface Props {
  api: TwoFactorApi;
  email: string;
  adding?: boolean;
  initialPassword?: string;
  initialSetup?: TotpEnrolment;
  onPasswordConsumed?: () => void;
  onComplete: (credential: TotpCredential) => void;
  onCancel: () => void;
  onStepChange?: (step: number) => void;
  onCloseAllowedChange?: (allowed: boolean) => void;
  afterLogin?: boolean;
}

export function TwoFactorEnrollment({
  api,
  email,
  adding = false,
  initialPassword = '',
  initialSetup,
  onPasswordConsumed,
  onComplete,
  onCancel,
  onStepChange,
  onCloseAllowedChange,
  afterLogin = false,
}: Props) {
  const {translate, clock} = useApplicationContext();
  const [step, setStep] = useState<EnrollmentStep>(Maybe.of(initialSetup).isJust ? 'scan' : 'password');
  const [password, setPassword] = useState(initialPassword);
  const [existingCode, setExistingCode] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState(translate('preferencesSecurityDefaultAppName'));
  const [setup, setSetup] = useState<Maybe<TotpEnrolment>>(Maybe.of(initialSetup));
  const [qr, setQr] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    onPasswordConsumed?.();
  }, [onPasswordConsumed]);

  useEffect(() => {
    if (!keyCopied && !codesCopied) {
      return undefined;
    }
    const timer = clock.setTimeout(() => {
      setKeyCopied(false);
      setCodesCopied(false);
    }, copyConfirmDuration);
    return () => {
      return clock.clearTimeout(timer);
    };
  }, [clock, keyCopied, codesCopied]);

  useEffect(() => {
    if (setup.isNothing || setup.value.uri === '') {
      return undefined;
    }
    let active = true;
    void task
      .tryOrElse(
        () => {
          return translate('preferencesSecurityQrError');
        },
        () => {
          return QRCode.toString(setup.value.uri, {type: 'svg', margin: 0, width: 140});
        },
      )
      .then(image => {
        if (!active) {
          return;
        }
        if (image.isOk) {
          setQr(`data:image/svg+xml,${encodeURIComponent(image.value)}`);
        } else {
          setError(image.error);
        }
      });
    return () => {
      active = false;
    };
  }, [setup, translate]);

  const navigate = (next: EnrollmentStep) => {
    setError('');
    setCode('');
    setStep(next);
    onStepChange?.(stepNumbers[next]);
  };

  const begin = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    onCloseAllowedChange?.(false);
    const enrolled = await api.enrol(name.trim(), {
      password,
      ...(adding ? {totp_code: `totp:${existingCode}` as const} : {}),
    });
    inFlight.current = false;
    setBusy(false);
    onCloseAllowedChange?.(true);
    if (enrolled.isErr) {
      setError(twoFactorError(enrolled.error, translate));
      return;
    }
    setSetup(Maybe.just(enrolled.value));
    setPassword('');
    setExistingCode('');
    setNeedsRestart(false);
    navigate('scan');
  };

  const verify = async () => {
    if (setup.isNothing || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    onCloseAllowedChange?.(false);
    const renamed = await api.rename(setup.value.credential_id, name.trim());
    if (renamed.isErr) {
      inFlight.current = false;
      setBusy(false);
      onCloseAllowedChange?.(true);
      setError(twoFactorError(renamed.error, translate));
      setNeedsRestart(['totp-enrolment-expired', 'totp-not-found'].includes(renamed.error));
      return;
    }
    const verified = await api.activate(setup.value.credential_id, code);
    inFlight.current = false;
    setBusy(false);
    if (verified.isErr) {
      onCloseAllowedChange?.(true);
      setError(twoFactorError(verified.error, translate));
      setNeedsRestart(['totp-enrolment-expired', 'totp-not-found'].includes(verified.error));
      return;
    }
    setCodes(verified.value.codes);
    setSaved(false);
    setQr('');
    // Activation returns codes once, including when adding an app. Keep them visible until acknowledged.
    setSetup(Maybe.just({...setup.value, secret: '', uri: ''}));
    onCloseAllowedChange?.(false);
    navigate('save');
  };

  const copy = async (value: string, isKey = false) => {
    const copied = await task.tryOrElse(
      () => {
        return translate('preferencesSecurityCopyError');
      },
      () => {
        return navigator.clipboard.writeText(value);
      },
    );
    if (copied.isErr) {
      setError(copied.error);
      return;
    }
    if (isKey) {
      setKeyCopied(true);
    } else {
      setCodesCopied(true);
    }
  };

  const finish = () => {
    if (!saved || setup.isNothing) {
      return;
    }
    onComplete({
      id: setup.value.credential_id,
      name: name.trim(),
      created_at: setup.value.server_time,
      activated_at: clock.currentDate.toISOString(),
    });
  };
  const number = stepNumbers[step];
  const scanHeading = translate(adding ? 'preferencesSecurityScanNewApp' : 'preferencesSecurityScanQr');
  const footerClass = afterLogin ? 'two-factor-footer two-factor-footer--stacked' : 'two-factor-footer';
  return (
    <div className="two-factor-dialog" aria-busy={busy}>
      {step !== 'password' && !afterLogin && (
        <div className="two-factor-steps">
          {translate(stepLabels[step])}
          <div className="two-factor-progress" aria-hidden="true">
            {progressSteps.map(progressStep => {
              return <span key={progressStep} className={stepNumbers[progressStep] <= number ? 'complete' : ''} />;
            })}
          </div>
        </div>
      )}
      {step === 'password' && (
        <>
          <h2>{translate(adding ? 'preferencesSecurityAddApp' : 'preferencesSecurityConfirmIdentity')}</h2>
          <p>{translate(adding ? 'preferencesSecurityPasswordForAddApp' : 'preferencesSecurityPasswordForSetup')}</p>
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
          {adding && (
            <CodeInput
              codeInputLabel={translate('preferencesSecurityAuthenticationCode')}
              codePlaceholder={translate('preferencesSecurityDigit')}
              digits={codeLength}
              onCodeChange={setExistingCode}
            />
          )}
          <div className={footerClass}>
            {!afterLogin && (
              <Button variant={ButtonVariant.SECONDARY} onClick={onCancel} disabled={busy}>
                {translate('preferencesSecurityCancel')}
              </Button>
            )}
            <Button
              onClick={begin}
              disabled={
                busy || password.length === 0 || name.trim() === '' || (adding && existingCode.length !== codeLength)
              }
            >
              {translate(busy ? 'preferencesSecurityPleaseWait' : 'preferencesSecurityContinue')}
            </Button>
            {afterLogin && (
              <Button
                className="two-factor-text-button"
                variant={ButtonVariant.TERTIARY}
                onClick={onCancel}
                disabled={busy}
              >
                {translate('preferencesSecurityRemindLater')}
              </Button>
            )}
          </div>
        </>
      )}
      {(step === 'scan' || step === 'key') && setup.isJust && (
        <>
          <h2>{step === 'key' ? translate('preferencesSecurityEnterSetupKey') : scanHeading}</h2>
          <p>{translate(step === 'key' ? 'preferencesSecurityManualDetail' : 'preferencesSecurityScanQrDetail')}</p>
          {step === 'scan' ? (
            <>
              {qr !== '' && (
                <img
                  className="two-factor-qr"
                  src={qr}
                  alt={translate('preferencesSecurityQrAlt')}
                  width={164}
                  height={164}
                />
              )}
              <Link
                className="two-factor-manual-link"
                variant={LinkVariant.PRIMARY}
                href="#setup-key"
                onClick={event => {
                  event.preventDefault();
                  navigate('key');
                }}
              >
                {translate('preferencesSecurityCannotScan')}
              </Link>
            </>
          ) : (
            <>
              <small>{translate('preferencesSecurityAccountLabel')}</small>
              <p>{email}</p>
              <small>{translate('preferencesSecuritySecretKey')}</small>
              <div className="two-factor-key" id="setup-key">
                <code>{setup.value.secret}</code>
                {keyCopied ? (
                  <span className="two-factor-copy-feedback" role="status">
                    <CheckIcon aria-hidden="true" />
                    {translate('preferencesSecuritySetupKeyCopied')}
                  </span>
                ) : (
                  <Link
                    className="two-factor-copy-action"
                    variant={LinkVariant.PRIMARY}
                    href="#setup-key"
                    onClick={event => {
                      event.preventDefault();
                      void copy(setup.value.secret, true);
                    }}
                  >
                    <CopyIcon aria-hidden="true" />
                    {translate('preferencesSecurityCopyKey')}
                  </Link>
                )}
              </div>
              <p>{translate('preferencesSecuritySetupType', {digits: setup.value.digits})}</p>
            </>
          )}
          <div className={footerClass}>
            {!afterLogin && (
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={
                  step === 'key'
                    ? () => {
                        return navigate('scan');
                      }
                    : onCancel
                }
              >
                {translate(step === 'key' ? 'preferencesSecurityBack' : 'preferencesSecurityCancel')}
              </Button>
            )}
            <Button
              onClick={() => {
                return navigate('verify');
              }}
            >
              {translate('preferencesSecurityContinue')}
            </Button>
            {afterLogin && (
              <Button
                className="two-factor-text-button"
                variant={ButtonVariant.TERTIARY}
                onClick={
                  step === 'key'
                    ? () => {
                        return navigate('scan');
                      }
                    : onCancel
                }
              >
                {translate(step === 'key' ? 'preferencesSecurityBack' : 'preferencesSecurityRemindLater')}
              </Button>
            )}
          </div>
        </>
      )}
      {step === 'verify' && setup.isJust && (
        <>
          <h2>{translate('preferencesSecurityVerifyCode', {digits: setup.value.digits})}</h2>
          <p>{translate('preferencesSecurityVerifyDetail')}</p>
          <Input
            id="two-factor-app-name"
            label={translate('preferencesSecurityAppName')}
            value={name}
            disabled={busy}
            onChange={event => {
              return setName(event.target.value);
            }}
          />
          <p>{translate('preferencesSecurityAppNameDetail')}</p>
          <CodeInput
            codeInputLabel={translate('preferencesSecurityAuthenticationCode')}
            codePlaceholder={translate('preferencesSecurityDigit')}
            digits={setup.value.digits}
            onCodeChange={setCode}
            markInvalid={error !== ''}
          />
          <small>{translate('preferencesSecurityCodeRefresh', {seconds: setup.value.period})}</small>
          <div className={footerClass}>
            {!afterLogin && (
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => {
                  return navigate('scan');
                }}
                disabled={busy}
              >
                {translate('preferencesSecurityBack')}
              </Button>
            )}
            {needsRestart ? (
              <Button
                onClick={() => {
                  setSetup(Maybe.nothing());
                  setQr('');
                  navigate('password');
                }}
              >
                {translate('preferencesSecurityStartAgain')}
              </Button>
            ) : (
              <Button onClick={verify} disabled={busy || name.trim() === '' || code.length !== setup.value.digits}>
                {translate(busy ? 'preferencesSecurityVerifying' : 'preferencesSecurityVerify')}
              </Button>
            )}
            {afterLogin && (
              <Button
                className="two-factor-text-button"
                variant={ButtonVariant.TERTIARY}
                onClick={() => {
                  return navigate('scan');
                }}
                disabled={busy}
              >
                {translate('preferencesSecurityBack')}
              </Button>
            )}
          </div>
        </>
      )}
      {step === 'save' && (
        <>
          <h2>{translate('preferencesSecuritySaveRecoveryCodes')}</h2>
          <RecoveryCodes
            codes={codes}
            onCopy={value => {
              void copy(value);
            }}
          />
          {codesCopied && <p role="status">{translate('preferencesSecurityCodesCopied')}</p>}
          <Checkbox
            checked={saved}
            onChange={event => {
              setSaved(event.target.checked);
            }}
          >
            <CheckboxLabel>{translate('preferencesSecuritySavedRecoveryCodes')}</CheckboxLabel>
          </Checkbox>
          <div className={footerClass}>
            <Button onClick={finish} disabled={!saved}>
              {translate('preferencesSecurityFinishSetup')}
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
