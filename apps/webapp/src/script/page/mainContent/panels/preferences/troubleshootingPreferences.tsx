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

import {useEffect, useState, type JSX} from 'react';

import {isNullOrUndefined, isUndefined} from '@sindresorhus/is';
import {Maybe, task} from 'true-myth';
import {useStore} from 'zustand';

import {PreferencesPage} from './components/preferencesPage';
import {DiagnosticStatusIcon as StatusIcon} from './troubleshooting/diagnosticStatusIcon';
import * as styles from './troubleshooting/troubleshooting.styles';

import * as Icon from '../../../../components/icon';
import {Config} from '../../../../Config';
import {getScanResults, scanTransports} from '../../../../repositories/troubleshooter/scanResults';
import type {
  TroubleshooterRepository,
  DiagnosticResult,
} from '../../../../repositories/troubleshooter/troubleshooterRepository';
import type {CheckStatus} from '../../../../repositories/troubleshooter/troubleshooterService';
import {ChevronDownIcon, ErrorStatusIcon, SuccessStatusIcon} from '../../../../uiKit';
import {ComputerIcon} from '../../../../uiKit/dataDisplay/icon/computerIcon';
import {NetworkBuildingIcon} from '../../../../uiKit/dataDisplay/icon/networkBuildingIcon';
import {WireLogoIcon} from '../../../../uiKit/dataDisplay/icon/wireLogoIcon';
import {Loading} from '../../../../uiKit/dataDisplay/loading/loading';
import {Button, ButtonVariant} from '../../../../uiKit/inputs/button/button';
import {copyText} from '../../../../util/clipboardUtil';
import {createReactTranslationMarker, renderReactTranslation} from '../../../../util/localizerUtil/reactLocalizerUtil';
import {downloadBlob} from '../../../../util/util';
import {useApplicationContext} from '../../../rootProvider';

const MILLISECONDS_PER_SECOND = 1_000;
const TURN_TLS_PORT = 5349;
const FUTURE_TURN_TLS_PORT = 443;
const directCallMarker = createReactTranslationMarker('troubleshooter-direct-call');
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

const qualityCheckIds = ['roundTrip', 'jitter', 'packetLoss'] as const;
type QualityCheckId = (typeof qualityCheckIds)[number];
const qualityThresholds = {
  roundTrip: {fair: 50, poorAbove: 150, unit: 'ms'},
  jitter: {fair: 10, poorAbove: 50, unit: 'ms'},
  packetLoss: {fair: 5, poorAbove: 10, unit: '%'},
} as const;
const qualityTones = ['bad', 'warning', 'good', 'muted'] as const;
const qualityStatusLabels = {
  bad: 'troubleshooter.qualityPoor',
  warning: 'troubleshooter.qualityFair',
  good: 'troubleshooter.status.good',
  muted: 'troubleshooter.noResult',
} as const;

const getQualityTone = (id: QualityCheckId, value: number | null | undefined): (typeof qualityTones)[number] => {
  if (value === undefined || value === null) {
    return 'muted';
  }
  const {fair, poorAbove} = qualityThresholds[id];
  if (value > poorAbove) {
    return 'bad';
  }
  return value >= fair ? 'warning' : 'good';
};
const connectionSteps = ['ice_gathering_finished', 'connected', 'media_flow', 'measurement_finished'] as const;
const connectionRouteLabels = {
  direct: 'troubleshooter.connectionSft',
  turn: 'troubleshooter.connectionViaRelay',
  unknown: 'troubleshooter.connectionSucceeded',
} as const;
const connectionTones = {ok: 'good', warning: 'warning', unknown: 'muted'} as const;

export const TroubleshootingPreferences = ({repository}: {repository: TroubleshooterRepository}): JSX.Element => {
  const {translate} = useApplicationContext();
  const {BRAND_NAME: brandName, VERSION: version} = Config.getConfig();
  const state = useStore(repository.store);
  useEffect(() => {
    return repository.reset;
  }, [repository]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const busy = state.running !== 'idle';
  const scanReport = state.scan
    .andThen(result => {
      return Maybe.of(result.data.report);
    })
    .unwrapOr(undefined);
  const {networkTone, networkRows, relayRuns, tlsRuns, stunRuns} = getScanResults(scanReport);
  const stunErrors = stunRuns.filter(run => {
    return run.error !== undefined;
  });
  const relayPorts = [
    ...new Set(
      relayRuns.map(run => {
        return run.port;
      }),
    ),
  ].toSorted((left, right) => {
    return left - right;
  });
  const hasRelay = relayRuns.length > 0;
  const tlsPorts = [
    ...new Set([
      TURN_TLS_PORT,
      FUTURE_TURN_TLS_PORT,
      ...tlsRuns.map(run => {
        return run.port;
      }),
    ]),
  ];
  const tlsFound = tlsRuns.some(run => {
    return run.hasRelay;
  });
  const tlsMissingTone = tlsRuns.length > 0 ? 'bad' : 'muted';
  const tlsTone = tlsFound ? 'good' : tlsMissingTone;
  const networkStatusKeys = {
    good: 'troubleshooter.status.good',
    warning: 'troubleshooter.status.partial',
    bad: 'troubleshooter.networkPreview.callNotPossible',
    muted: 'troubleshooter.noResult',
  } as const;
  const relayStatus = hasRelay ? 'relay' : 'unknown';
  const relayTone = hasRelay ? 'warning' : 'muted';
  const hasPublicAddress = networkRows.some(row => {
    return row.publicFound;
  });
  const reachabilityStatus = hasPublicAddress ? 'reachable' : relayStatus;
  const reachabilityTone = hasPublicAddress ? 'good' : relayTone;
  const renderNetworkResult = (found: boolean): JSX.Element => {
    const ResultIcon = found ? SuccessStatusIcon : ErrorStatusIcon;
    return (
      <span
        css={styles.networkDetailStatusStyles}
        role="img"
        aria-label={translate(found ? 'troubleshooter.networkPreview.found' : 'troubleshooter.networkPreview.notFound')}
      >
        <ResultIcon width={14} height={14} />
      </span>
    );
  };
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
  const qualityChecks =
    state.connection
      .andThen(result => {
        return Maybe.of(result.data.qualityChecks);
      })
      .unwrapOr(undefined) ?? [];
  const measuredQuality = state.connection
    .andThen(result => {
      return Maybe.of('report' in result.data ? result.data.report.network : undefined);
    })
    .unwrapOr(undefined);
  const measurements = {
    roundTrip: measuredQuality?.roundTripTimeMs,
    jitter: measuredQuality?.jitterMs,
    packetLoss: measuredQuality?.packetLossPercent,
  };
  const hasMeasurements = Object.values(measurements).some(value => {
    return value !== undefined && value !== null;
  });
  const failedStep = connectionSteps.find(step => {
    return state.connectionProgress[step]?.status === 'error';
  });
  const incompleteConnectionLabel =
    failedStep === 'connected' ? 'troubleshooter.connectionFailed' : 'troubleshooter.connectionNotConfirmed';
  const currentStep = connectionSteps.find(step => {
    return state.connectionProgress[step]?.status !== 'ok';
  });
  const completedSteps = connectionSteps.filter(step => {
    return state.connectionProgress[step]?.status === 'ok';
  }).length;
  const hasQualityResults = qualityCheckIds.every(id => {
    return qualityChecks.some(check => {
      return check.id === id;
    });
  });
  const measuredTones = qualityCheckIds.map(id => {
    return getQualityTone(id, measurements[id]);
  });
  const measuredTone =
    qualityTones.find(tone => {
      return measuredTones.includes(tone);
    }) ?? 'muted';
  const qualityTone = hasQualityResults ? 'good' : measuredTone;
  const renderQualityCheck = (id: QualityCheckId): JSX.Element => {
    const check = Maybe.of(
      qualityChecks.find(value => {
        return value.id === id;
      }),
    );
    const measurement = measurements[id];
    const tone = check
      .map(value => {
        return statusTone(value.status);
      })
      .unwrapOr(getQualityTone(id, measurement));
    const value = check
      .map(value => {
        return value.value !== '' ? value.value : translate(`troubleshooter.status.${value.status}`);
      })
      .unwrapOr(
        isNullOrUndefined(measurement)
          ? translate('troubleshooter.noResult')
          : `${measurement.toLocaleString()} ${qualityThresholds[id].unit}`,
      );
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
          {(state.running === 'connection' || !isUndefined(failedStep)) && (
            <div css={styles.connectionProgressStyles} aria-live="polite">
              {state.running === 'connection' && <strong>{translate('troubleshooter.testing')}</strong>}
              <progress
                value={completedSteps}
                max={connectionSteps.length}
                aria-label={translate('troubleshooter.connectionProgress')}
              />
              <ol>
                {connectionSteps.map(step => {
                  const progress = state.connectionProgress[step];
                  const active = state.running === 'connection' && currentStep === step;
                  const finishedTone = progress?.status === 'ok' ? 'good' : 'muted';
                  return (
                    <li key={step} aria-current={active ? 'step' : undefined}>
                      {active ? (
                        <span css={styles.statusIconStyles} aria-hidden="true">
                          <Loading size={16} color="#238636" />
                        </span>
                      ) : (
                        <StatusIcon tone={progress?.status === 'error' ? 'bad' : finishedTone} />
                      )}
                      <div>
                        {translate(`troubleshooter.connectionStep.${step}`)}
                        {active && step === 'measurement_finished' && (
                          <small>{translate('troubleshooter.connectionMeasurementWait')}</small>
                        )}
                        {progress?.status === 'error' && (
                          <small>{progress.error ?? translate('troubleshooter.testError')}</small>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {!isUndefined(failedStep) && (
                <small>
                  <span css={failedStep === 'connected' ? styles.statusStyles('bad') : undefined}>
                    {translate(
                      state.connectionProgress.connected?.status === 'ok'
                        ? 'troubleshooter.connectionSucceeded'
                        : incompleteConnectionLabel,
                      {brandName},
                    )}
                  </span>
                </small>
              )}
            </div>
          )}
          {state.connection
            .map(result => {
              const data = result.data;
              const isMock = 'route' in data;
              const route = isMock ? 'turn' : (data.report.wireServer.route ?? 'unknown');
              const viaRelay = route === 'turn';
              const networkTone = isMock ? 'warning' : connectionTones[data.report.network.status];
              const wireTone = isMock ? 'warning' : connectionTones[data.report.wireServer.status];
              const wireLineStyles = {
                direct: styles.routeLineStyles,
                turn: styles.relayLineStyles,
                unknown: styles.unknownRouteLineStyles,
              };
              return (
                <>
                  <div css={styles.scanStyles}>
                    <div css={styles.routeStyles}>
                      <div>
                        <span css={styles.routeIconStyles}>
                          <ComputerIcon />
                          <StatusIcon tone="good" />
                        </span>
                        <strong>{translate('troubleshooter.computer')}</strong>
                        <small>
                          {translate(isMock ? 'troubleshooter.devicesOk' : 'troubleshooter.connectionMicrophoneReady')}
                        </small>
                      </div>
                      <span css={styles.routeLineStyles} aria-hidden="true" />
                      <div>
                        <span css={styles.routeIconStyles}>
                          <NetworkBuildingIcon />
                          <StatusIcon tone={networkTone} />
                        </span>
                        <strong>{translate('troubleshooter.network')}</strong>
                        <small>
                          {translate(
                            isMock ? 'troubleshooter.fastRouteBlocked' : 'troubleshooter.connectionEstablished',
                          )}
                        </small>
                      </div>
                      <span css={wireLineStyles[route]} aria-hidden="true" />
                      <div>
                        <span css={styles.routeIconStyles}>
                          <WireLogoIcon />
                          <StatusIcon tone={wireTone} />
                        </span>
                        <strong>{brandName}</strong>
                        <small>{translate(connectionRouteLabels[route], {brandName})}</small>
                      </div>
                    </div>
                    <details css={styles.connectionQualityStyles}>
                      <summary>
                        <StatusIcon tone={qualityTone} />
                        <div>
                          <strong>{translate('troubleshooter.group.quality.title')}</strong>
                          <small>{translate('troubleshooter.group.quality.subtitle')}</small>
                        </div>
                        <span css={styles.statusStyles(qualityTone)}>
                          {translate(qualityStatusLabels[qualityTone])}
                        </span>
                        <span css={styles.networkResultChevronStyles} aria-hidden="true">
                          <ChevronDownIcon width={12} height={12} />
                        </span>
                      </summary>
                      <div css={styles.scanBodyStyles}>
                        {(hasMeasurements || hasQualityResults) && (
                          <p>
                            {translate(
                              hasMeasurements
                                ? 'troubleshooter.connectionMeasurementsDescription'
                                : 'troubleshooter.group.quality.description',
                              {brandName},
                            )}
                          </p>
                        )}
                        <ul css={styles.checkListStyles}>{qualityCheckIds.map(renderQualityCheck)}</ul>
                        <details css={styles.qualityThresholdsStyles}>
                          <summary>{translate('troubleshooter.qualityThresholds')}</summary>
                          <ul>
                            {qualityCheckIds.map(id => {
                              const {fair, poorAbove, unit} = qualityThresholds[id];
                              return (
                                <li key={id}>
                                  {translate(`troubleshooter.check.${id}.title`)} ·{' '}
                                  {translate('troubleshooter.qualityThresholdRange', {fair, poorAbove, unit})}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                        {hasQualityResults && <p>{translate('troubleshooter.group.quality.advice', {brandName})}</p>}
                      </div>
                    </details>
                  </div>
                  {viaRelay && (
                    <div css={styles.warningStyles}>
                      <StatusIcon tone="warning" />
                      <div>
                        <strong>{translate('troubleshooter.warningTitle')}</strong>
                        <p>
                          {translate(
                            isMock ? 'troubleshooter.warningDescription' : 'troubleshooter.connectionRelayDescription',
                            {brandName},
                          )}
                        </p>
                      </div>
                    </div>
                  )}
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
            .map(() => {
              return (
                <div key="scan-results" css={styles.scanStyles}>
                  <details>
                    <summary>
                      <StatusIcon tone={networkTone} />
                      <div>
                        <strong>{translate('troubleshooter.group.network.title')}</strong>
                        <small>UDP · TCP · TLS · IPv4 · IPv6</small>
                      </div>
                      <span css={styles.statusStyles(networkTone)}>{translate(networkStatusKeys[networkTone])}</span>
                      <span css={styles.networkResultChevronStyles} aria-hidden="true">
                        <ChevronDownIcon width={12} height={12} />
                      </span>
                    </summary>
                    <div css={styles.scanBodyStyles}>
                      <ul css={styles.networkResultListStyles}>
                        {networkRows.flatMap(row => {
                          const isTransport = row.id === 'udp' || row.id === 'tcp';
                          const protocol = isTransport ? row.id.toUpperCase() : row.id.replace('ipv', 'IPv');
                          const networkRow = (
                            <li key={row.id}>
                              <details>
                                <summary>
                                  <StatusIcon tone={row.tone} />
                                  <strong>{translate(`troubleshooter.check.${row.id}.title`)}</strong>
                                  <span css={styles.statusStyles(row.tone)}>
                                    {row.status === 'partial'
                                      ? translate('troubleshooter.status.partial')
                                      : translate(`troubleshooter.networkPreview.${row.status}`)}
                                  </span>
                                  <span css={styles.networkResultChevronStyles} aria-hidden="true">
                                    <ChevronDownIcon width={12} height={12} />
                                  </span>
                                </summary>
                                <dl css={styles.networkResultStyles}>
                                  <div>
                                    <dt>
                                      {translate('troubleshooter.networkPreview.transportLocal', {protocol})}
                                      <small>
                                        {translate(
                                          isTransport
                                            ? 'troubleshooter.networkPreview.transportLocalDescription'
                                            : 'troubleshooter.networkPreview.localDescription',
                                          {protocol},
                                        )}
                                      </small>
                                    </dt>
                                    <dd>{renderNetworkResult(row.localFound)}</dd>
                                    {!isTransport && (
                                      <dd css={styles.networkResultAddressesStyles}>
                                        <ul>
                                          {row.local.map(address => {
                                            return <li key={address}>{address}</li>;
                                          })}
                                          {row.mdnsNames.map(name => {
                                            return <li key={name}>{name} (mDNS)</li>;
                                          })}
                                          {!row.localFound && (
                                            <li>{translate('troubleshooter.networkPreview.noIpAddress')}</li>
                                          )}
                                        </ul>
                                        {row.mdnsNames.length > 0 && (
                                          <small>{translate('troubleshooter.networkPreview.mdnsAddressFamily')}</small>
                                        )}
                                      </dd>
                                    )}
                                  </div>
                                  <div>
                                    <dt>
                                      {translate('troubleshooter.networkPreview.transportPublic', {protocol})}
                                      <small>
                                        {renderReactTranslation({
                                          translatedText: translate(
                                            isTransport
                                              ? 'troubleshooter.networkPreview.transportPublicDescription'
                                              : 'troubleshooter.networkPreview.publicDescription',
                                            {
                                              direct: directCallMarker.substitution,
                                              protocol,
                                            },
                                          ),
                                          componentReplacements: [],
                                          valueReplacements: [],
                                          nodeReplacements: [
                                            {
                                              marker: directCallMarker,
                                              render: () => {
                                                return (
                                                  <strong>{translate('troubleshooter.networkPreview.direct')}</strong>
                                                );
                                              },
                                            },
                                          ],
                                        })}
                                      </small>
                                    </dt>
                                    <dd>{renderNetworkResult(row.publicFound)}</dd>
                                    {!isTransport && (
                                      <dd css={styles.networkResultAddressesStyles}>
                                        <ul>
                                          {(row.publicFound
                                            ? row.publicAddresses
                                            : [translate('troubleshooter.networkPreview.noIpAddress')]
                                          ).map(address => {
                                            return <li key={address}>{address}</li>;
                                          })}
                                        </ul>
                                      </dd>
                                    )}
                                  </div>
                                </dl>
                              </details>
                            </li>
                          );
                          if (row.id !== 'tcp') {
                            return [networkRow];
                          }
                          return [
                            networkRow,
                            <li key="tls">
                              <details>
                                <summary>
                                  <StatusIcon tone={tlsTone} />
                                  <strong>{translate('troubleshooter.check.tls.title')}</strong>
                                  <span css={styles.statusStyles(tlsTone)}>
                                    {translate(
                                      tlsFound
                                        ? 'troubleshooter.networkPreview.found'
                                        : 'troubleshooter.networkPreview.notFound',
                                    )}
                                  </span>
                                  <span css={styles.networkResultChevronStyles} aria-hidden="true">
                                    <ChevronDownIcon width={12} height={12} />
                                  </span>
                                </summary>
                                <div css={styles.networkResultStyles}>
                                  <small>{translate('troubleshooter.networkPreview.tlsDescription')}</small>
                                  {tlsPorts.map(port => {
                                    const tests = tlsRuns.filter(run => {
                                      return run.port === port;
                                    });
                                    const portFound = tests.some(run => {
                                      return run.hasRelay;
                                    });
                                    return (
                                      <section key={port}>
                                        <div css={styles.tlsPortHeadingStyles}>
                                          <span
                                            css={
                                              tests.length > 0 && !portFound ? styles.statusStyles('bad') : undefined
                                            }
                                          >
                                            {translate('troubleshooter.networkPreview.tlsPort', {port})}
                                          </span>
                                          {tests.length > 0 && renderNetworkResult(portFound)}
                                        </div>
                                        {tests.length === 0 && (
                                          <small>
                                            {translate(
                                              port === FUTURE_TURN_TLS_PORT
                                                ? 'troubleshooter.networkPreview.tlsComingSoon'
                                                : 'troubleshooter.noResult',
                                            )}
                                          </small>
                                        )}
                                        {tests.length > 0 && (
                                          <dl css={styles.tlsServerListStyles}>
                                            {[
                                              ...new Set(
                                                tests.map(run => {
                                                  return run.address;
                                                }),
                                              ),
                                            ].map(address => {
                                              const serverRuns = tests.filter(run => {
                                                return run.address === address;
                                              });
                                              const found = serverRuns.some(run => {
                                                return run.hasRelay;
                                              });
                                              const messages = [
                                                ...new Set(
                                                  serverRuns.flatMap(run => {
                                                    return run.errors.flatMap(error => {
                                                      const message = error.message.trim();
                                                      if (message !== '') {
                                                        return [message];
                                                      }
                                                      return error.code === null
                                                        ? []
                                                        : [
                                                            translate('troubleshooter.networkPreview.tlsErrorCode', {
                                                              code: error.code,
                                                            }),
                                                          ];
                                                    });
                                                  }),
                                                ),
                                              ];
                                              return (
                                                <div key={address}>
                                                  <dt>
                                                    <code>{address}</code>
                                                    {!found &&
                                                      messages.map(message => {
                                                        return (
                                                          <small key={message}>
                                                            <span css={styles.statusStyles('bad')}>{message}</span>
                                                          </small>
                                                        );
                                                      })}
                                                  </dt>
                                                  <dd css={styles.statusStyles(found ? 'good' : 'bad')}>
                                                    {translate(
                                                      found
                                                        ? 'troubleshooter.reachabilityPreview.connected'
                                                        : 'troubleshooter.networkPreview.notFound',
                                                    )}
                                                  </dd>
                                                </div>
                                              );
                                            })}
                                          </dl>
                                        )}
                                      </section>
                                    );
                                  })}
                                </div>
                              </details>
                            </li>,
                          ];
                        })}
                      </ul>
                      <small css={styles.networkQualityNoteStyles}>
                        {translate('troubleshooter.networkPreview.transportQuality')}
                      </small>
                    </div>
                  </details>
                  <details>
                    <summary>
                      <StatusIcon tone={reachabilityTone} />
                      <div>
                        <strong>{translate('troubleshooter.group.reachability.title', {brandName})}</strong>
                        <small>{translate('troubleshooter.reachabilityPreview.subtitle')}</small>
                      </div>
                      <span css={styles.statusStyles(reachabilityTone)}>
                        {translate(`troubleshooter.reachabilityPreview.${reachabilityStatus}`)}
                      </span>
                      <span css={styles.networkResultChevronStyles} aria-hidden="true">
                        <ChevronDownIcon width={12} height={12} />
                      </span>
                    </summary>
                    <div css={styles.scanBodyStyles}>
                      <ul css={styles.networkResultListStyles}>
                        <li>
                          <details>
                            <summary>
                              <StatusIcon tone="muted" />
                              <div>
                                <strong>{translate('troubleshooter.check.sft.title', {brandName})}</strong>
                                <small>{translate('troubleshooter.check.sft.description')}</small>
                              </div>
                              <span css={styles.statusStyles('muted')}>
                                {translate('troubleshooter.reachabilityPreview.notTested')}
                              </span>
                              <span css={styles.networkResultChevronStyles} aria-hidden="true">
                                <ChevronDownIcon width={12} height={12} />
                              </span>
                            </summary>
                            <div css={styles.networkResultStyles}>
                              <p>{translate('troubleshooter.reachabilityPreview.connectionHint')}</p>
                              <a href="#connection-test-title">{translate('troubleshooter.connectionTitle')}</a>
                            </div>
                          </details>
                        </li>
                        <li>
                          <details>
                            <summary>
                              <StatusIcon tone={hasRelay ? 'good' : 'muted'} />
                              <div>
                                <strong>{translate('troubleshooter.check.turn.title', {brandName})}</strong>
                                <small>{translate('troubleshooter.check.turn.description')}</small>
                              </div>
                              <span css={styles.statusStyles(hasRelay ? 'good' : 'muted')}>
                                {translate(
                                  hasRelay ? 'troubleshooter.reachabilityPreview.connected' : 'troubleshooter.noResult',
                                )}
                              </span>
                              <span css={styles.networkResultChevronStyles} aria-hidden="true">
                                <ChevronDownIcon width={12} height={12} />
                              </span>
                            </summary>
                            {scanTransports.flatMap(protocol => {
                              return relayPorts.map(port => {
                                const servers = relayRuns.filter(server => {
                                  return server.port === port && server.protocol === protocol;
                                });
                                if (servers.length === 0) {
                                  return null;
                                }
                                return (
                                  <div key={`${protocol}/${port}`} css={styles.relayResultGroupStyles}>
                                    <h4>
                                      {translate('troubleshooter.reachabilityPreview.endpoint', {
                                        port,
                                        protocol: protocol.toUpperCase(),
                                      })}
                                    </h4>
                                    <dl css={[styles.networkResultStyles, styles.relayResultStyles]}>
                                      {servers.map(relayTest => {
                                        return (
                                          <div key={relayTest.id}>
                                            <dt>
                                              <code>{relayTest.address}</code>
                                              {relayTest.gatheringDurationMs !== null && (
                                                <small>
                                                  {translate('troubleshooter.reachabilityPreview.gatheringTime', {
                                                    time: relayTest.gatheringDurationMs.toLocaleString(),
                                                  })}
                                                </small>
                                              )}
                                            </dt>
                                            <dd>
                                              <span css={styles.statusStyles('good')}>
                                                {translate('troubleshooter.reachabilityPreview.connected')}
                                              </span>
                                            </dd>
                                          </div>
                                        );
                                      })}
                                    </dl>
                                  </div>
                                );
                              });
                            })}
                          </details>
                        </li>
                        <li>
                          <details>
                            <summary>
                              <StatusIcon tone={hasPublicAddress ? 'good' : 'bad'} />
                              <div>
                                <strong>{translate('troubleshooter.reachabilityPreview.incoming')}</strong>
                                <small>{translate('troubleshooter.check.incoming.description')}</small>
                              </div>
                              <span css={styles.statusStyles(hasPublicAddress ? 'good' : 'bad')}>
                                {translate(
                                  hasPublicAddress
                                    ? 'troubleshooter.reachabilityPreview.reachable'
                                    : 'troubleshooter.reachabilityPreview.notReachable',
                                )}
                              </span>
                              <span css={styles.networkResultChevronStyles} aria-hidden="true">
                                <ChevronDownIcon width={12} height={12} />
                              </span>
                            </summary>
                            {scanTransports.map(transport => {
                              const protocol = transport.toUpperCase();
                              const endpoints = stunRuns.flatMap(
                                ({id, server, protocol: runProtocol, publicEndpoint}) => {
                                  if (runProtocol !== transport || publicEndpoint === undefined) {
                                    return [];
                                  }
                                  return (
                                    <div key={id}>
                                      <dt>
                                        {translate(
                                          'troubleshooter.reachabilityPreview.stunPublicEndpoint',
                                          publicEndpoint,
                                        )}
                                      </dt>
                                      <dd>
                                        <span css={styles.statusStyles('good')}>
                                          {translate('troubleshooter.reachabilityPreview.reachable')}
                                        </span>
                                      </dd>
                                      {server !== undefined && (
                                        <dd css={{gridColumn: '1 / -1'}}>
                                          <small>
                                            {translate('troubleshooter.reachabilityPreview.stunServer', {
                                              server: server.address,
                                              port: server.port,
                                            })}
                                          </small>
                                        </dd>
                                      )}
                                    </div>
                                  );
                                },
                              );
                              if (endpoints.length === 0) {
                                return null;
                              }
                              return (
                                <div key={protocol} css={styles.relayResultGroupStyles}>
                                  <h4>{protocol}</h4>
                                  <dl css={[styles.networkResultStyles, styles.relayResultStyles]}>{endpoints}</dl>
                                </div>
                              );
                            })}
                            {stunErrors.length > 0 && (
                              <dl css={styles.networkResultStyles}>
                                {stunErrors.map(({id, server, error, protocol}) => {
                                  return (
                                    <div key={id}>
                                      <dt css={[styles.statusStyles('bad'), {gridColumn: '1 / -1'}]}>
                                        {error?.message}
                                      </dt>
                                      <dd css={{gridColumn: '1 / -1'}}>
                                        {server !== undefined && (
                                          <small>
                                            {translate('troubleshooter.reachabilityPreview.stunServer', {
                                              server: server.address,
                                              port: server.port,
                                            })}
                                            {protocol !== undefined && ` · ${protocol.toUpperCase()}`}
                                          </small>
                                        )}
                                      </dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            )}
                            <small css={styles.stunNoteStyles}>
                              {translate('troubleshooter.reachabilityPreview.stunNote')}
                            </small>
                          </details>
                        </li>
                      </ul>
                    </div>
                  </details>
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
          {scanReport !== undefined && <p css={styles.mutedStyles}>{translate('troubleshooter.scanAddressNotice')}</p>}
        </section>
        {state.error
          .map(error => {
            const message =
              error.name === 'TimeoutError' ? 'troubleshooter.connectionTimeout' : 'troubleshooter.testError';
            return (
              <p key="test-error" role="alert">
                {translate(message)}
              </p>
            );
          })
          .unwrapOr(<></>)}
      </div>
    </PreferencesPage>
  );
};
