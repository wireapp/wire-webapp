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

import type {ScanCandidate, ScanReport} from '@wireapp/avs';

const DEFAULT_ICE_PORT = 3478;
const DEFAULT_SECURE_ICE_PORT = 5349;
export const scanTransports = ['udp', 'tcp'] as const;
type Transport = (typeof scanTransports)[number];
type ScanServer = {address: string; port: number; isRelay: boolean; tls: boolean; transport: Transport};
type ScanError = ScanReport['runs'][number]['errors'][number];
type RelayRun = ScanServer & {
  id: number;
  protocol: Transport;
  gatheringDurationMs: number | null;
};
type NetworkSummary = {
  local: string[];
  publicAddresses: string[];
  localFound: boolean;
  publicFound: boolean;
  tone: 'good' | 'warning' | 'muted';
  status: 'found' | 'partial' | 'notFound';
};
type ScanResults = {
  networkTone: 'good' | 'warning' | 'bad' | 'muted';
  networkRows: (NetworkSummary & {id: Transport | 'ipv4' | 'ipv6'; mdnsNames: string[]})[];
  relayRuns: RelayRun[];
  tlsRuns: (RelayRun & {hasRelay: boolean; errors: ScanError[]})[];
  stunRuns: {
    id: string;
    protocol: Transport | undefined;
    server: ScanServer | undefined;
    publicEndpoint?: {address: string; port: number};
    error?: ScanError;
  }[];
};

const getNetworkTone = (rows: ScanResults['networkRows']): 'good' | 'warning' | 'bad' => {
  const udp = rows.find(row => {
    return row.id === 'udp';
  });
  const ipRows = rows.filter(row => {
    return row.id === 'ipv4' || row.id === 'ipv6';
  });
  const hasIp = ipRows.some(row => {
    return row.status !== 'notFound';
  });
  const hasTransport = rows.some(row => {
    return (row.id === 'udp' || row.id === 'tcp') && row.status !== 'notFound';
  });
  if (!hasIp || !hasTransport) {
    return 'bad';
  }
  const hasCompleteIp = ipRows.some(row => {
    return row.status === 'found';
  });
  return udp?.status === 'found' && hasCompleteIp ? 'good' : 'warning';
};

const parseServer = (value: string | null): ScanServer | undefined => {
  const match = /^(stuns?|turns?):(?:\/\/)?(\[[^\]]+\]|[^:/?#]+)(?::(\d+))?(?:\?([^#]*))?$/.exec(value ?? '');
  if (match === null) {
    return undefined;
  }
  const [, scheme, address, port, query] = match;
  const secure = scheme.endsWith('s');
  const transport = new URLSearchParams(query).get('transport');
  const defaultPort = secure ? DEFAULT_SECURE_ICE_PORT : DEFAULT_ICE_PORT;
  return {
    address,
    port: port === undefined ? defaultPort : Number(port),
    isRelay: scheme.startsWith('turn'),
    tls: scheme === 'turns' && transport === 'tcp',
    transport: transport === 'tcp' || (transport !== 'udp' && secure) ? 'tcp' : 'udp',
  };
};

const candidateIp = ({ip}: ScanCandidate): string => {
  return (ip ?? '').replace(/^\[|\]$/g, '');
};

const ipFamily = (candidate: ScanCandidate): 'ipv4' | 'ipv6' | undefined => {
  const ip = candidateIp(candidate);
  if (ip.includes(':')) {
    return 'ipv6';
  }
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) ? 'ipv4' : undefined;
};

const candidateAddress = (candidate: ScanCandidate): string => {
  const ip = candidateIp(candidate);
  return ip === '' ? (candidate.hostname ?? '') : ip;
};

const addresses = (candidates: readonly ScanCandidate[]): string[] => {
  return [...new Set(candidates.map(candidateAddress).filter(Boolean))];
};

const summarize = (local: string[], publicAddresses: string[], mdnsNames: string[]): NetworkSummary => {
  const localFound = local.length > 0 || mdnsNames.length > 0;
  const publicFound = publicAddresses.length > 0;
  if (localFound && publicFound) {
    return {local, publicAddresses, localFound, publicFound, tone: 'good', status: 'found'};
  }
  if (localFound || publicFound) {
    return {local, publicAddresses, localFound, publicFound, tone: 'warning', status: 'partial'};
  }
  return {local, publicAddresses, localFound, publicFound, tone: 'muted', status: 'notFound'};
};

export const getScanResults = (report: ScanReport | undefined): ScanResults => {
  const runs = report?.runs ?? [];
  const candidates = runs.flatMap(run => {
    return run.localCandidates;
  });
  const hosts = candidates.filter(candidate => {
    return candidate.type === 'host';
  });
  const publicCandidates = candidates.filter(candidate => {
    return candidate.type === 'srflx' && ipFamily(candidate) !== undefined;
  });
  const mdnsNames = addresses(hosts).filter(address => {
    return /\.local\.?$/i.test(address);
  });
  const network = [...scanTransports, 'ipv4', 'ipv6'] as const;
  const networkRows = network.map(id => {
    const isTransport = id === 'udp' || id === 'tcp';
    const matches = (candidate: ScanCandidate): boolean => {
      return isTransport ? candidate.protocol === id : ipFamily(candidate) === id;
    };
    const local = addresses(hosts.filter(matches));
    const names = isTransport ? [] : mdnsNames;
    return {
      id,
      ...summarize(local, addresses(publicCandidates.filter(matches)), names),
      mdnsNames: names,
    };
  });
  const relayTests = runs.flatMap((run, index) => {
    const hasRelay = run.localCandidates.some(candidate => {
      return candidate.type === 'relay';
    });
    if (run.serverUrl === null) {
      return [];
    }
    const server = parseServer(run.serverUrl) ?? parseServer(`turn:${run.serverUrl}`);
    if (server?.isRelay !== true) {
      return [];
    }
    return {
      ...server,
      id: index,
      protocol: run.requestedTransport ?? server.transport,
      gatheringDurationMs: run.gatheringDurationMs,
      hasRelay,
      errors: run.errors,
    };
  });
  const relayRuns = relayTests.filter(run => {
    return run.hasRelay;
  });
  const tlsRuns = relayTests.filter(run => {
    return run.tls;
  });

  const stunRuns = runs.flatMap((run, index) => {
    const runServer = parseServer(run.serverUrl);
    const publicEndpoints = run.localCandidates.flatMap(candidate => {
      const address = candidateIp(candidate);
      if (candidate.type !== 'srflx' || address === '' || candidate.port === null) {
        return [];
      }
      const server = parseServer(candidate.serverUrl) ?? runServer;
      return {
        id: `${index}/${candidate.id}`,
        protocol: candidate.protocol ?? run.requestedTransport ?? server?.transport,
        server,
        publicEndpoint: {address, port: candidate.port},
        error: undefined,
      };
    });
    const errors = run.errors.flatMap((error, errorIndex) => {
      const server = parseServer(error.url ?? run.serverUrl);
      if (server?.isRelay !== false) {
        return [];
      }
      return {
        id: `${index}/error/${errorIndex}`,
        protocol: server.transport,
        server,
        publicEndpoint: undefined,
        error,
      };
    });
    return [...publicEndpoints, ...errors];
  });

  const networkTone = report === undefined ? 'muted' : getNetworkTone(networkRows);
  return {networkTone, networkRows, relayRuns, tlsRuns, stunRuns};
};
