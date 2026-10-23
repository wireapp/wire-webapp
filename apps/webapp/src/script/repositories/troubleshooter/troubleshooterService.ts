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

import type {Clock} from '@enormora/clock/clock';
import {Task, task} from 'true-myth';

export type CheckStatus = 'allowed' | 'blocked' | 'available' | 'unavailable' | 'relay' | 'reached' | 'good';
export type CheckId =
  'udp' | 'tcp' | 'tls' | 'ipv4' | 'ipv6' | 'sft' | 'turn' | 'incoming' | 'roundTrip' | 'jitter' | 'packetLoss';
export type DiagnosticCheck = {
  id: CheckId;
  status: CheckStatus;
  value: string;
  address: string;
  port: number;
};
export type ConnectionResult = {route: 'relay'; devices: 'ok'};
export type ScanResult = {checks: readonly DiagnosticCheck[]};
export type TroubleshooterService = {
  testConnection: () => Task<ConnectionResult, Error>;
  runFullScan: () => Task<ScanResult, Error>;
};

export const MOCK_CONNECTION_DELAY_MILLISECONDS = 1_500;
export const MOCK_SCAN_DELAY_MILLISECONDS = 3_000;

// Fixtures only: no microphone, camera or network access is performed.
export const createMockTroubleshooterService = (clock: Clock): TroubleshooterService => {
  const afterDelay = <T>(value: T, delay: number): Task<T, Error> => {
    return task.fromPromise(
      new Promise<T>(resolve => {
        clock.setTimeout(() => {
          resolve(value);
        }, delay);
      }),
      () => {
        return new Error('Mock diagnosis failed');
      },
    );
  };
  const checks: readonly DiagnosticCheck[] = [
    {id: 'udp', status: 'blocked', value: '', address: 'mock-relay.example.invalid', port: 3478},
    {id: 'tcp', status: 'allowed', value: '', address: 'mock-relay.example.invalid', port: 3478},
    {id: 'tls', status: 'allowed', value: '', address: 'mock-relay.example.invalid', port: 443},
    {id: 'ipv4', status: 'available', value: '', address: '192.0.2.1', port: 443},
    {id: 'ipv6', status: 'unavailable', value: '', address: '2001:db8::1', port: 443},
    {id: 'sft', status: 'relay', value: '', address: 'mock-conference.example.invalid', port: 443},
    {id: 'turn', status: 'reached', value: '', address: 'mock-relay.example.invalid', port: 443},
    {id: 'incoming', status: 'blocked', value: '', address: '192.0.2.1', port: 49152},
    {id: 'roundTrip', status: 'good', value: '42 ms', address: 'mock-relay.example.invalid', port: 443},
    {id: 'jitter', status: 'good', value: '3 ms', address: 'mock-relay.example.invalid', port: 443},
    {id: 'packetLoss', status: 'good', value: '0 %', address: 'mock-relay.example.invalid', port: 443},
  ];
  return {
    testConnection: () => {
      return afterDelay<ConnectionResult>({route: 'relay', devices: 'ok'}, MOCK_CONNECTION_DELAY_MILLISECONDS);
    },
    runFullScan: () => {
      return afterDelay<ScanResult>({checks}, MOCK_SCAN_DELAY_MILLISECONDS);
    },
  };
};
