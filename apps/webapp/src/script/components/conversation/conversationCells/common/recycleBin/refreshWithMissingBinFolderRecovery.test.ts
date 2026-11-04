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

import {refreshWithMissingBinFolderRecovery} from './refreshWithMissingBinFolderRecovery';

const createHttpError = (status: number): Error => {
  return Object.assign(new Error('Request failed'), {isAxiosError: true, response: {status}});
};

interface SetupOptions {
  readonly refresh: () => Promise<boolean>;
  readonly isInBinSubfolder?: boolean;
}

interface Setup {
  readonly run: () => Promise<boolean>;
  readonly navigateToBinRoot: jest.Mock;
}

const setup = ({refresh, isInBinSubfolder = true}: SetupOptions): Setup => {
  const navigateToBinRoot = jest.fn();
  const run = (): Promise<boolean> => {
    return refreshWithMissingBinFolderRecovery({
      refresh,
      isInBinSubfolder: () => {
        return isInBinSubfolder;
      },
      navigateToBinRoot,
    });
  };
  return {run, navigateToBinRoot};
};

describe('refreshWithMissingBinFolderRecovery', () => {
  it.each([true, false])('returns %s from a refresh that did not throw, without navigating', async refreshed => {
    const {run, navigateToBinRoot} = setup({
      refresh: jest.fn().mockResolvedValue(refreshed),
    });

    await expect(run()).resolves.toBe(refreshed);

    expect(navigateToBinRoot).not.toHaveBeenCalled();
  });

  it('goes to the Bin root and counts the refresh as successful when the viewed Bin folder is gone', async () => {
    const {run, navigateToBinRoot} = setup({
      refresh: jest.fn().mockRejectedValue(createHttpError(404)),
    });

    await expect(run()).resolves.toBe(true);

    expect(navigateToBinRoot).toHaveBeenCalledTimes(1);
  });

  it('still fails a 404 when the viewed path is not a Bin subfolder', async () => {
    const error = createHttpError(404);
    const {run, navigateToBinRoot} = setup({refresh: jest.fn().mockRejectedValue(error), isInBinSubfolder: false});

    await expect(run()).rejects.toBe(error);

    expect(navigateToBinRoot).not.toHaveBeenCalled();
  });

  it.each([500, 503, 403, 401])('still fails a %s from a Bin subfolder', async status => {
    const error = createHttpError(status);
    const {run, navigateToBinRoot} = setup({refresh: jest.fn().mockRejectedValue(error)});

    await expect(run()).rejects.toBe(error);

    expect(navigateToBinRoot).not.toHaveBeenCalled();
  });

  it('still fails an error that is not an HTTP error', async () => {
    const error = new Error('network down');
    const {run, navigateToBinRoot} = setup({refresh: jest.fn().mockRejectedValue(error)});

    await expect(run()).rejects.toBe(error);

    expect(navigateToBinRoot).not.toHaveBeenCalled();
  });
});
