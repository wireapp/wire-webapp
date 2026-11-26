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

import {
  networkStatsButton,
  networkStatsDialog,
  networkStatsPopover,
  networkStatsRows,
} from './ParticipantNetworkStats.styles';

import {CloseIcon} from '../../uiKit/dataDisplay/icon/closeIcon';
import {StatisticsIcon} from '../../uiKit/dataDisplay/icon/statisticsIcon';
import {NetworkIcon} from '../icon';

type OpenStats = {id: string | null; setId: (id: string | null) => void};
const OpenStatsContext = createContext<OpenStats | null>(null);

export const ParticipantNetworkStatsProvider = ({children}: {children: ReactNode}): ReactNode => {
  const [id, setId] = useState<string | null>(null);
  return <OpenStatsContext.Provider value={{id, setId}}>{children}</OpenStatsContext.Provider>;
};

// Preview fixtures only. Values describe outgoing media for self and incoming media for peers.
const dummyStats = {
  self: {rtt: '24 ms', audio: '32 kbit/s', audioJitter: '3 ms', loss: '0.00%', video: '1.24 Mbit/s', jitter: '8 ms'},
  peer: {rtt: '38 ms', audio: '32 kbit/s', audioJitter: '5 ms', loss: '0.12%', video: '1.08 Mbit/s', jitter: '12 ms'},
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

export const ParticipantNetworkStats = ({
  name,
  isSelf,
  variant = 'tile',
}: {
  name: string;
  isSelf: boolean;
  variant?: 'tile' | 'toolbar';
}): ReactNode => {
  const id = useId();
  const shared = useContext(OpenStatsContext);
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = shared === null ? localOpen : shared.id === id;
  const values = dummyStats[isSelf ? 'self' : 'peer'];
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
                <small>Network statistics · Demo data</small>
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
            <div className="quality">
              <span>Connectivity quality</span>
              <strong>
                <i />
                Stable
              </strong>
            </div>
            <div className="quality">
              <span>Media quality</span>
              <strong>
                <i />
                Good
              </strong>
            </div>
            <StatRows rows={[['Round trip time', values.rtt]]} />
            <section aria-label="Audio statistics">
              <h3>Audio</h3>
              <StatRows
                rows={[
                  ['Bandwidth', values.audio],
                  ['Jitter', values.audioJitter],
                  ['Packet loss', '0.00%'],
                ]}
              />
            </section>
            <section aria-label="Video statistics">
              <h3>Video</h3>
              <StatRows
                rows={[
                  ['Bandwidth', values.video],
                  ['Jitter', values.jitter],
                  ['Packet loss', values.loss],
                  ['Resolution', '1280 × 720'],
                  ['Frame rate', '30 fps'],
                ]}
              />
            </section>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  );
};
