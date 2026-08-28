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

import {useState} from 'react';

import {CloseIcon} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';

const SHARED_DRIVE_SUPPORT_URL =
  'https://support.wire.com/auth/v3/signin?brand_id=162184&locale=en-us&return_to=https%3A%2F%2Fsupport.wire.com%2Fhc%2Fen-us%2Farticles%2F36679600377373-File-permissions-in-Shared-Drive&role=end_user';

export const ConversationViewerPermissionBanner = () => {
  const {translate} = useApplicationContext();
  const sharedDriveSupportUrl = Config.getConfig().URL.SUPPORT.SHARED_DRIVE || SHARED_DRIVE_SUPPORT_URL;
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="conversation-viewer-permission-banner" role="status">
      <div className="conversation-viewer-permission-banner__content">
        <span>{translate('conversationFileUploadRestrictedOverlayDescription')}</span>
        <a
          className="conversation-viewer-permission-banner__learn-more"
          href={sharedDriveSupportUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          data-uie-name="conversation-viewer-permission-learn-more"
        >
          {translate('historyInfo.learnMore')}
        </a>
      </div>
      <button
        type="button"
        className="conversation-viewer-permission-banner__close"
        aria-label={translate('accessibility.rightPanel.close')}
        onClick={() => setIsVisible(false)}
      >
        <CloseIcon />
      </button>
    </div>
  );
};
