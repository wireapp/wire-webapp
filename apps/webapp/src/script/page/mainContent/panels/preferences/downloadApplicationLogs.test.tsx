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
import {Maybe, task} from 'true-myth';

import {DownloadApplicationLogs} from './downloadApplicationLogs';

import englishTranslations from '../../../../../i18n/en-US.json';
import type {ApplicationLogDownload} from '../../../../logger/applicationLogDownload';
import {ThemeProvider} from '../../../../uiKit/identity/theme/theme';
import type {TranslationKey} from '../../../../util/localizerUtil/translationTypes';

function translateToEnglish(key: TranslationKey): string {
  return englishTranslations[key];
}

function renderDownload(downloadApplicationLogs: Maybe<ApplicationLogDownload>): void {
  render(
    <ThemeProvider>
      <DownloadApplicationLogs downloadApplicationLogs={downloadApplicationLogs} translate={translateToEnglish} />
    </ThemeProvider>,
  );
}

describe('DownloadApplicationLogs', () => {
  it('labels the diagnostic logs section and download button', () => {
    renderDownload(
      Maybe.just(() => {
        return task.resolve('saved');
      }),
    );

    expect(screen.getByRole('group', {name: 'Diagnostic logs'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Download application logs'})).toBeEnabled();
  });

  it('renders nothing when the download capability is unavailable', () => {
    renderDownload(Maybe.nothing());
    expect(screen.queryByRole('group', {name: 'Diagnostic logs'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each(['saved', 'cancelled', 'failed'] as const)(
    'restores the button after %s and only reports failures',
    async outcome => {
      const completion = Promise.withResolvers<void>();
      const download = jest.fn(() => {
        return task
          .tryOr('failed' as const, () => {
            return completion.promise;
          })
          .andThen(() => {
            return outcome === 'failed' ? task.reject(outcome) : task.resolve(outcome);
          });
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
        completion.resolve();
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

  it('recovers from an unexpected throw and clears the error on retry', async () => {
    const retry = Promise.withResolvers<'saved'>();
    const download = jest
      .fn<ReturnType<ApplicationLogDownload>, []>()
      .mockImplementationOnce(() => {
        throw new Error('Unexpected failure');
      })
      .mockImplementationOnce(() => {
        return task.tryOr('failed' as const, () => {
          return retry.promise;
        });
      });
    renderDownload(Maybe.just(download));
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Application logs could not be downloaded. Please try again.',
    );
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => {
      retry.resolve('saved');
    });
    expect(button).toBeEnabled();
  });
});
