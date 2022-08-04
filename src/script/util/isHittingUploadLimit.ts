/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {t} from 'Util/LocalizerUtil';

import {AssetRepository} from '../assets/AssetRepository';
import {ModalsViewModel} from '../view_model/ModalsViewModel';

const CONCURRENT_UPLOAD_LIMIT = 10;

const isHittingUploadLimit = (files: File[], assetRepository: AssetRepository): boolean => {
  const concurrentUploads = files.length + assetRepository.getNumberOfOngoingUploads();
  const isHittingUploadLimit = concurrentUploads > CONCURRENT_UPLOAD_LIMIT;

  if (isHittingUploadLimit) {
    const modalOptions = {
      text: {
        message: t('modalAssetParallelUploadsMessage', CONCURRENT_UPLOAD_LIMIT),
        title: t('modalAssetParallelUploadsHeadline'),
      },
    };

    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }

  return isHittingUploadLimit;
};

export default isHittingUploadLimit;
