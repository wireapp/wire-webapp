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

import {z} from 'zod';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export const defaultCallLogsServerAddress = 'https://localhost:8080';
export const callLogsServerAddressSchema = z
  .string()
  .trim()
  .url()
  .pipe(
    z
      .string()
      .refine(address => {
        const url = new URL(address);
        return (
          ['https:', 'http:'].includes(url.protocol) &&
          url.username === '' &&
          url.password === '' &&
          url.pathname === '/' &&
          url.search === '' &&
          url.hash === ''
        );
      })
      .transform(address => {
        return new URL(address).origin;
      }),
  );

type CallLogsUploadSettings = {
  mode: 'mock' | 'server';
  serverAddress: string;
  setMode: (mode: 'mock' | 'server') => void;
  setServerAddress: (address: string) => void;
};

export const useCallLogsUploadSettings = create<CallLogsUploadSettings>()(
  persist(
    set => {
      return {
        mode: 'mock',
        serverAddress: defaultCallLogsServerAddress,
        setMode: mode => {
          set({mode});
        },
        setServerAddress: address => {
          set({serverAddress: address});
        },
      };
    },
    {
      name: 'wire-call-logs-upload-settings',
      merge: (persisted, current) => {
        const settings = z
          .object({mode: z.enum(['mock', 'server']), serverAddress: callLogsServerAddressSchema})
          .safeParse(persisted);
        return settings.success ? {...current, ...settings.data} : current;
      },
      partialize: ({mode, serverAddress}) => {
        return {mode, serverAddress};
      },
    },
  ),
);
