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

import {useState, type JSX} from 'react';

import {Maybe, task} from 'true-myth';
import {useStore} from 'zustand';

import {Button, ButtonVariant, ComputerIcon, Loading, NetworkBuildingIcon, WireLogoIcon} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import type {TroubleshooterRepository, DiagnosticResult} from 'Repositories/troubleshooter/troubleshooterRepository';
import type {CheckId, CheckStatus} from 'Repositories/troubleshooter/troubleshooterService';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {copyText} from 'Util/clipboardUtil';
import {downloadBlob} from 'Util/util';

import {PreferencesPage} from './components/preferencesPage';
import {DiagnosticStatusIcon as StatusIcon} from './troubleshooting/diagnosticStatusIcon';
import * as styles from './troubleshooting/troubleshooting.styles';

const MILLISECONDS_PER_SECOND = 1_000;
const statusTone = (status: CheckStatus): 'good' | 'warning' | 'bad' | 'muted' => {
  if (status === 'blocked') {
    return 'bad';
  }
  if (status === 'relay') {
    return 'warning';
  }
  if (status === 'unavailable') {
    return 'muted';
  }
  return 'good';
};

const groups = [
  {id: 'network', tone: 'warning', status: 'partial', checks: ['udp', 'tcp', 'tls', 'ipv4', 'ipv6'], open: true},
  {id: 'reachability', tone: 'warning', status: 'relay', checks: ['sft', 'turn', 'incoming'], open: true},
  {id: 'quality', tone: 'good', status: 'good', checks: ['roundTrip', 'jitter', 'packetLoss'], open: false},
] as const;

export const TroubleshootingPreferences = ({repository}: {repository: TroubleshooterRepository}): JSX.Element => {
  const {translate} = useApplicationContext();
  const {BRAND_NAME: brandName, VERSION: version} = Config.getConfig();
  const state = useStore(repository.store);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const busy = state.running !== 'idle';
  const runConnection = (): void => {
    setCopyState('idle');
    void repository.testConnection();
  };
  const runScan = (): void => {
    setCopyState('idle');
    void repository.runFullScan();
  };
  const timestamp = <T,>(result: DiagnosticResult<T>, scan: boolean): string => {
    const date = new Date(result.completedAt);
    return translate(scan ? 'troubleshooter.scanTime' : 'troubleshooter.connectionTime', {
      time: date.toLocaleString(),
      seconds: Math.round(result.durationMilliseconds / MILLISECONDS_PER_SECOND),
    });
  };
  const renderCheck = (id: CheckId): JSX.Element => {
    const check = state.scan.andThen(result => {
      return Maybe.of(
        result.data.checks.find(value => {
          return value.id === id;
        }),
      );
    });
    const tone = check
      .map(value => {
        return statusTone(value.status);
      })
      .unwrapOr('muted' as const);
    const value = check
      .map(value => {
        return value.value !== '' ? value.value : translate(`troubleshooter.status.${value.status}`);
      })
      .unwrapOr(translate('troubleshooter.noResult'));
    return (
      <li key={id}>
        <StatusIcon tone={tone} />
        <div>
          <strong>{translate(`troubleshooter.check.${id}.title`, {brandName})}</strong>
          <small>{translate(`troubleshooter.check.${id}.description`)}</small>
        </div>
        <span css={styles.statusStyles(tone)}>{value}</span>
      </li>
    );
  };
  return (
    <PreferencesPage title={translate('preferencesTroubleshooting')}>
      <div css={styles.pageStyles}>
        <section aria-labelledby="connection-test-title">
          <div css={styles.sectionHeaderStyles}>
            <h3 id="connection-test-title">{translate('troubleshooter.connectionTitle')}</h3>
            {state.connection
              .map(result => {
                return (
                  <span key="connection-time" css={styles.mutedStyles}>
                    {timestamp(result, false)}
                  </span>
                );
              })
              .unwrapOr(<></>)}
          </div>
          <p>{translate('troubleshooter.connectionDescription', {brandName})}</p>
          {state.connection
            .map(() => {
              return (
                <>
                  <div css={styles.routeStyles}>
                    <div>
                      <span css={styles.routeIconStyles}>
                        <ComputerIcon />
                        <StatusIcon tone="good" />
                      </span>
                      <strong>{translate('troubleshooter.computer')}</strong>
                      <small>{translate('troubleshooter.devicesOk')}</small>
                    </div>
                    <span css={styles.routeLineStyles} aria-hidden="true" />
                    <div>
                      <span css={styles.routeIconStyles}>
                        <NetworkBuildingIcon />
                        <StatusIcon tone="warning" />
                      </span>
                      <strong>{translate('troubleshooter.network')}</strong>
                      <small>{translate('troubleshooter.fastRouteBlocked')}</small>
                    </div>
                    <span css={styles.relayLineStyles} aria-hidden="true" />
                    <div>
                      <span css={styles.routeIconStyles}>
                        <WireLogoIcon />
                        <StatusIcon tone="warning" />
                      </span>
                      <strong>{brandName}</strong>
                      <small>{translate('troubleshooter.viaRelay')}</small>
                    </div>
                  </div>
                  <div css={styles.warningStyles}>
                    <StatusIcon tone="warning" />
                    <div>
                      <strong>{translate('troubleshooter.warningTitle')}</strong>
                      <p>{translate('troubleshooter.warningDescription', {brandName})}</p>
                    </div>
                  </div>
                </>
              );
            })
            .unwrapOr(<></>)}
          <div css={styles.actionsStyles}>
            <Button type="button" variant={ButtonVariant.PRIMARY} disabled={busy} onClick={runConnection}>
              <span aria-hidden="true">{state.connection.isJust ? '↻' : '▶'}&nbsp; </span>
              {translate(state.connection.isJust ? 'troubleshooter.testAgain' : 'troubleshooter.testConnection')}
            </Button>
            {(state.connection.isJust || state.scan.isJust) && (
              <Button
                type="button"
                variant={ButtonVariant.SECONDARY}
                disabled={busy}
                onClick={async () => {
                  const copied = await task.tryOrElse(
                    () => {
                      return new Error('Clipboard unavailable');
                    },
                    () => {
                      return copyText(repository.getReport(version));
                    },
                  );
                  setCopyState(copied.isOk ? 'copied' : 'error');
                }}
              >
                <Icon.CopyIcon />
                &nbsp;{translate('troubleshooter.copyResults')}
              </Button>
            )}
          </div>
          {state.running === 'connection' && (
            <div role="status" css={styles.actionsStyles}>
              <Loading />
              {translate('troubleshooter.testing')}
            </div>
          )}
          <div role="status" aria-live="polite">
            {copyState === 'copied' && translate('troubleshooter.copied')}
            {copyState === 'error' && translate('troubleshooter.copyError')}
          </div>
        </section>
        <section aria-labelledby="full-scan-title">
          <div css={styles.sectionHeaderStyles}>
            <h3 id="full-scan-title">{translate('troubleshooter.scanTitle')}</h3>
            {state.scan
              .map(result => {
                return (
                  <span key="scan-time" css={styles.mutedStyles}>
                    {timestamp(result, true)}
                  </span>
                );
              })
              .unwrapOr(<></>)}
          </div>
          <p>{translate('troubleshooter.scanDescription', {brandName})}</p>
          {state.scan
            .map(result => {
              return (
                <div key="scan-results" css={styles.scanStyles}>
                  {groups.map(group => {
                    const hasResults = group.checks.every(id => {
                      return result.data.checks.some(check => {
                        return check.id === id;
                      });
                    });
                    const tone = hasResults ? group.tone : 'muted';
                    return (
                      <details key={group.id} open={group.open}>
                        <summary>
                          <StatusIcon tone={tone} />
                          <div>
                            <strong>{translate(`troubleshooter.group.${group.id}.title`, {brandName})}</strong>
                            <small>{translate(`troubleshooter.group.${group.id}.subtitle`)}</small>
                          </div>
                          <span css={styles.statusStyles(tone)}>
                            {hasResults
                              ? translate(`troubleshooter.status.${group.status}`)
                              : translate('troubleshooter.noResult')}
                          </span>
                        </summary>
                        <div css={styles.scanBodyStyles}>
                          <p>
                            {hasResults
                              ? translate(`troubleshooter.group.${group.id}.description`, {brandName})
                              : translate('troubleshooter.noResult')}
                          </p>
                          <ul css={styles.checkListStyles}>{group.checks.map(renderCheck)}</ul>
                          <p>{translate(`troubleshooter.group.${group.id}.advice`, {brandName})}</p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              );
            })
            .unwrapOr(<></>)}
          <div css={styles.actionsStyles}>
            <Button type="button" variant={ButtonVariant.SECONDARY} disabled={busy} onClick={runScan}>
              <span aria-hidden="true">⌕&nbsp;</span>
              {translate(state.scan.isJust ? 'troubleshooter.scanAgain' : 'troubleshooter.runScan')}
            </Button>
          </div>
          {state.running === 'scan' && (
            <div role="status" css={styles.actionsStyles}>
              <Loading />
              {translate('troubleshooter.scanning')}
            </div>
          )}
          {(state.scan.isJust || state.connection.isJust) && (
            <p css={styles.mutedStyles}>{translate('troubleshooter.reportExplanation')}</p>
          )}
        </section>
        <section aria-labelledby="troubleshooter-report-title">
          <h3 id="troubleshooter-report-title">{translate('troubleshooter.reportTitle', {brandName})}</h3>
          <div css={styles.actionsStyles}>
            <Button
              type="button"
              variant={ButtonVariant.SECONDARY}
              disabled={busy}
              onClick={() => {
                downloadBlob(
                  new Blob([repository.getReport(version)], {type: 'application/json;charset=utf-8'}),
                  'troubleshooting-report.json',
                );
              }}
            >
              {translate('troubleshooter.saveReport')}
            </Button>
          </div>
          <p>{translate('troubleshooter.reportDescription', {brandName})}</p>
          <p css={styles.mutedStyles}>{translate('troubleshooter.mockNotice')}</p>
        </section>
        {state.error.isJust && <p role="alert">{translate('troubleshooter.testError')}</p>}
      </div>
    </PreferencesPage>
  );
};
