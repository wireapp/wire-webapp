/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {FEATURE_KEY, FeatureList} from '@wireapp/api-client/lib/team';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ModalType, getModalOptions} from 'src/script/E2EIdentity/Modals';

import {Runtime} from '@wireapp/commons';

export const configureDownloadPath = (teamFeatures: FeatureList) => {
  const downloadPathNotifier =
    teamFeatures[FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]?.status === 'enabled' &&
    localStorage.getItem('enforcedDownloadLocation') !==
      teamFeatures[FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]?.config.enforcedDownloadLocation &&
    Runtime.isDesktopApp() &&
    Runtime.isWindows();

  if (downloadPathNotifier) {
    localStorage.setItem(
      'enforcedDownloadLocation',
      teamFeatures[FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]?.config.enforcedDownloadLocation ?? '',
    );
    const {modalOptions, modalType} = getModalOptions({type: ModalType.DOWNLOAD_PATH_CHANGED});
    PrimaryModal.show(modalType, modalOptions);
  }
};
