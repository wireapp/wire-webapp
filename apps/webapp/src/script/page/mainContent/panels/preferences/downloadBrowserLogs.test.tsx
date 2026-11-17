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
 */

import {isNull} from '@sindresorhus/is';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {Maybe} from 'true-myth';

import {DownloadBrowserLogs} from './downloadBrowserLogs';

import type {BrowserLogDownload, BrowserLogDownloadOutcome} from '../../../../logger/createBrowserLogDownload';
import {ThemeProvider} from '../../../../uiKit/identity/theme/theme';
import {translateForTest} from '../../../../util/test/translateForTest';

function renderDownload(downloadBrowserLogs: Maybe<BrowserLogDownload>): void {
  render(
    <ThemeProvider>
      <DownloadBrowserLogs downloadBrowserLogs={downloadBrowserLogs} translate={translateForTest} />
    </ThemeProvider>,
  );
}

describe('DownloadBrowserLogs', () => {
  it('renders nothing when the download capability is unavailable', () => {
    renderDownload(Maybe.nothing());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each(['saved', 'cancelled', 'failed'] as const)(
    'restores the button after %s and only reports failures',
    async outcome => {
      const completion = Promise.withResolvers<BrowserLogDownloadOutcome>();
      const download = jest.fn(() => {
        return completion.promise;
      });
      renderDownload(Maybe.just(download));
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
      });
      expect(download).toHaveBeenCalledTimes(1);
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(download).toHaveBeenCalledTimes(1);
      await act(async () => {
        completion.resolve(outcome);
      });
      expect(button).toBeEnabled();
      expect(isNull(screen.queryByRole('alert'))).toBe(outcome !== 'failed');
      fireEvent.click(button);
      await waitFor(() => {
        expect(download).toHaveBeenCalledTimes(2);
        expect(button).toBeEnabled();
      });
    },
  );

  it('recovers from unexpected rejections and clears the error on retry', async () => {
    const retry = Promise.withResolvers<BrowserLogDownloadOutcome>();
    const download = jest
      .fn<ReturnType<BrowserLogDownload>, []>()
      .mockRejectedValueOnce(new Error('Unexpected failure'))
      .mockReturnValueOnce(retry.promise);
    renderDownload(Maybe.just(download));
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(translateForTest('preferencesBrowserLogsFailed'));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => {
      retry.resolve('saved');
    });
    expect(button).toBeEnabled();
  });
});
