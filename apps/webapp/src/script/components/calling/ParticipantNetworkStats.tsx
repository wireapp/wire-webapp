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

import {createContext, useContext, useId, useState, type ReactNode} from 'react';

import {Button, Dialog, DialogTrigger, Popover} from 'react-aria-components';

import {QUALITY, type AudioMetrics, type VideoMetrics} from '@wireapp/avs';

import {
  networkStatsButton,
  networkStatsDialog,
  networkStatsPopover,
  networkStatsRows,
} from './ParticipantNetworkStats.styles';

import type {ParticipantNetworkSample} from '../../repositories/calling/participantNetworkStats';
import {CloseIcon} from '../../uiKit/dataDisplay/icon/closeIcon';
import {StatisticsIcon} from '../../uiKit/dataDisplay/icon/statisticsIcon';
import {NetworkIcon} from '../icon';

type OpenStats = {id: string | null; setId: (id: string | null) => void};
const OpenStatsContext = createContext<OpenStats | null>(null);

export const ParticipantNetworkStatsProvider = ({children}: {children: ReactNode}): ReactNode => {
  const [id, setId] = useState<string | null>(null);
  return <OpenStatsContext.Provider value={{id, setId}}>{children}</OpenStatsContext.Provider>;
};

const qualityLabels: Record<number, string> = {
  [QUALITY.NORMAL]: 'Good',
  [QUALITY.MEDIUM]: 'Fair',
  [QUALITY.POOR]: 'Poor',
  [QUALITY.NETWORK_PROBLEM]: 'Network problem',
  [QUALITY.RECONNECTING]: 'Reconnecting',
};
const qualityColors: Record<number, string> = {
  [QUALITY.NORMAL]: '#27883e',
  [QUALITY.MEDIUM]: '#b56a12',
  [QUALITY.POOR]: '#c62828',
  [QUALITY.NETWORK_PROBLEM]: '#c62828',
  [QUALITY.RECONNECTING]: '#c62828',
};
const decimalPlaces = 2;
const bitsPerKilobit = 1000;
const bitsPerMegabit = 1000000;
const metric = (value: number | undefined, suffix: string): string => {
  return value === undefined || !Number.isFinite(value) || value < 0
    ? '—'
    : `${Number(value.toFixed(decimalPlaces))}${suffix}`;
};
const bitrate = (value: number | undefined): string => {
  if (value === undefined || value < 0) {
    return '—';
  }
  return value >= bitsPerMegabit
    ? metric(value / bitsPerMegabit, ' Mbit/s')
    : metric(value / bitsPerKilobit, ' kbit/s');
};

const StatRows = ({rows}: {rows: [string, string][]}): ReactNode => {
  return (
    <dl css={networkStatsRows}>
      {rows.map(([label, value]) => {
        return (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        );
      })}
    </dl>
  );
};

const MediaStats = ({
  label,
  tracks,
}: {
  label: 'Audio' | 'Video';
  tracks: (AudioMetrics | VideoMetrics)[];
}): ReactNode => {
  const displayed: (AudioMetrics | VideoMetrics | undefined)[] = tracks.length === 0 ? [undefined] : tracks;
  return displayed.map((track, index) => {
    const video = track !== undefined && 'width' in track ? track : undefined;
    const rows: [string, string][] = [
      ['Bandwidth', bitrate(track?.bitrate)],
      ['Jitter', metric(track?.jitter, ' ms')],
      ['Packet loss', metric(track?.loss, '%')],
    ];
    if (label === 'Video') {
      rows.push(
        [
          'Resolution',
          video !== undefined && video.width > 0 && video.height > 0 ? `${video.width} × ${video.height}` : '—',
        ],
        ['Frame rate', metric(video?.fps, ' fps')],
      );
    }
    return (
      <section key={`${label}-${index}`} aria-label={`${label} statistics${index > 0 ? ` ${index + 1}` : ''}`}>
        <h3>
          {label}
          {tracks.length > 1 ? ` · Track ${index + 1}` : ''}
        </h3>
        <StatRows rows={rows} />
      </section>
    );
  });
};

export const ParticipantNetworkStats = ({
  name,
  isSelf,
  variant = 'tile',
  sample,
}: {
  name: string;
  isSelf: boolean;
  variant?: 'tile' | 'toolbar';
  sample?: ParticipantNetworkSample;
}): ReactNode => {
  const id = useId();
  const shared = useContext(OpenStatsContext);
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = shared === null ? localOpen : shared.id === id;
  const quality = sample?.quality;
  const qualityLabel = quality == null ? 'Unknown' : (qualityLabels[quality] ?? 'Unknown');
  const qualityColor = quality == null ? 'var(--gray-60)' : (qualityColors[quality] ?? 'var(--gray-60)');
  const connection = sample?.connection;
  const connectedTo = sample?.peer === undefined ? '—' : {Server: 'SFT', User: 'Peer', Unknown: '—'}[sample.peer];
  let route = '—';
  const localCandidate = connection?.local_cand ?? connection?.candidate;
  if (localCandidate === 'Relay' || connection?.remote_cand === 'Relay') {
    route = 'TURN relay';
  } else if (localCandidate !== undefined && localCandidate !== 'Unknown' && localCandidate !== '???') {
    route = 'Direct';
  }
  const isToolbar = variant === 'toolbar';
  const label = isToolbar ? 'My connection statistics' : `Network statistics for ${name}`;
  const setOpen = (open: boolean): void => {
    if (shared === null) {
      setLocalOpen(open);
    } else if (open) {
      shared.setId(id);
    } else if (shared.id === id) {
      shared.setId(null);
    }
  };

  return (
    <div
      role="presentation"
      css={isToolbar ? undefined : {position: 'absolute', top: 8, left: 8, zIndex: 5}}
      onDoubleClick={event => {
        event.stopPropagation();
      }}
      onKeyDown={event => {
        event.stopPropagation();
      }}
    >
      <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
        <Button
          css={isToolbar ? undefined : networkStatsButton}
          className={isToolbar ? 'video-controls__button_primary' : undefined}
          aria-label={label}
          data-uie-name="network-stats-trigger"
        >
          {isToolbar ? (
            <StatisticsIcon width={18} height={18} />
          ) : (
            <NetworkIcon width={18} height={18} css={{'& path': {fill: 'currentColor'}}} />
          )}
        </Button>
        <Popover css={networkStatsPopover} placement={isToolbar ? 'top end' : 'bottom start'} offset={8} isNonModal>
          <Dialog css={networkStatsDialog} aria-label={label}>
            <header>
              <div>
                <strong>{isToolbar ? 'My connection' : name}</strong>
                <small>
                  {sample === undefined
                    ? 'Network statistics'
                    : `Updated ${new Date(sample.receivedAt).toLocaleTimeString()}`}
                </small>
              </div>
              <Button
                aria-label="Close network statistics"
                onPress={() => {
                  setOpen(false);
                }}
              >
                <CloseIcon width={12} height={12} color="currentColor" aria-hidden="true" />
              </Button>
            </header>
            {sample === undefined && <p role="status">Waiting for AVS statistics…</p>}
            {(isSelf || quality != null) && (
              <div className="quality">
                <span>Connectivity quality</span>
                <strong>
                  <i css={{background: qualityColor}} />
                  {qualityLabel}
                </strong>
              </div>
            )}
            <StatRows
              rows={[[isSelf ? 'Connection RTT' : 'Round trip time', metric(sample?.rttMs ?? undefined, ' ms')]]}
            />
            {isSelf && (
              <StatRows
                rows={[
                  ['Connected to', connectedTo],
                  ['Route', route],
                  ['Protocol', connection?.local_proto ?? connection?.protocol ?? '—'],
                ]}
              />
            )}
            <MediaStats label="Audio" tracks={sample?.audio ?? []} />
            <MediaStats label="Video" tracks={sample?.video ?? []} />
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  );
};
