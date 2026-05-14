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

import {create} from 'zustand';

/**
 * Ephemeral Zustand store for live scan progress (D17, D18).
 * Holds per-conversation stage labels like 'Loading events', 'Calling LLM'.
 * Wiped on page reload. Written by ScanRunner (non-React), read by React UI via hook.
 */
interface ReportsStoreState {
  liveStage: Record<string, string>;
}

export const useReportsStore = create<ReportsStoreState>()(() => ({
  liveStage: {},
}));
