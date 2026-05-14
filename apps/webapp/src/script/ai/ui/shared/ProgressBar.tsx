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

interface ProgressBarProps {
  done: number;
  total: number;
}

/** Reusable horizontal progress bar showing done/total ratio. Guards against total=0. */
export const ProgressBar = ({done, total}: ProgressBarProps) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${done} of ${total} conversations processed`}
      style={{width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px'}}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: '#3b82f6',
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
};
