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

import {FC} from 'react';

import * as Icon from 'Components/Icon';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale} from 'Util/TimeUtil';

interface DetailViewModalHeaderProps {
  messageEntity: ContentMessage;
  onCloseClick: () => void;
}

const DetailViewModalHeader: FC<DetailViewModalHeaderProps> = ({messageEntity, onCloseClick}) => {
  const {user, timestamp, unsafeSenderName} = useKoSubscribableChildren(messageEntity, [
    'user',
    'timestamp',
    'unsafeSenderName',
  ]);

  return (
    <header className="detail-view-header">
      <div className="text-center">
        <div
          className="label-bold-xs"
          data-uie-name="fullscreen-picture-sender"
          data-uie-uid={user.id}
          data-uie-value={user.name()}
        >
          {unsafeSenderName}
        </div>

        <div className="label-xs" data-timestamp={timestamp}>
          {formatLocale(timestamp, 'P p')}
        </div>
      </div>

      <button
        type="button"
        className="detail-view-header-close-button icon-button"
        aria-label={t('accessibility.conversationDetailsCloseLabel')}
        onClick={onCloseClick}
        data-uie-name="do-close-detail-view"
      >
        <Icon.CloseIcon />
      </button>
    </header>
  );
};

export {DetailViewModalHeader};
