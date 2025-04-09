/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {CSSProperties, useEffect, useState} from 'react';

import {easeOutStyles, loadingStyles, wrapperStyles} from './FileCardLoading.styles';

interface FileCardLoadingProps {
  /**
   * Progress of the file card loading
   * @default 100
   */
  progress?: number;
}

const MAX_PROGRESS = 100;
const INITIAL_PROGRESS = 0;
const FAKE_PROGRESS = 20;
const FAKE_PROGRESS_DELAY = 200;

export const FileCardLoading = ({progress = MAX_PROGRESS}: FileCardLoadingProps) => {
  const [fakeProgress, setFakeProgress] = useState(INITIAL_PROGRESS);

  // After the timeout, we set progress to a small value to indicate that the file is loading
  // This is to avoid the progress bar from not showing up when progress is 0 for a longer time
  useEffect(() => {
    if (progress !== INITIAL_PROGRESS) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setFakeProgress(FAKE_PROGRESS);
    }, FAKE_PROGRESS_DELAY);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div css={wrapperStyles}>
      <div
        css={[loadingStyles, progress === MAX_PROGRESS && easeOutStyles]}
        style={{'--progress': `${progress > fakeProgress ? progress : fakeProgress}%`} as CSSProperties}
      />
    </div>
  );
};
