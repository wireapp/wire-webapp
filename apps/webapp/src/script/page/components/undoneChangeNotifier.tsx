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

import {useEffect, type FunctionComponent} from 'react';

import {useAppNotification} from '../../components/appNotification';

type UndoneChangeNotifierProps = {
  readonly messageRepository: {
    onChangeUndone: (listener: (change: 'edit' | 'delete') => void) => () => void;
  };
  readonly translate: (key: 'outboxChangeUndoneEdit' | 'outboxChangeUndoneDelete') => string;
};

/** Tells the user when an edit or a deletion was taken back because it could not be sent */
export const UndoneChangeNotifier: FunctionComponent<UndoneChangeNotifierProps> = ({messageRepository, translate}) => {
  const notification = useAppNotification();

  useEffect(() => {
    return messageRepository.onChangeUndone(change => {
      notification.show({
        message: translate(change === 'edit' ? 'outboxChangeUndoneEdit' : 'outboxChangeUndoneDelete'),
      });
    });
    // `notification` is a new object on every render, and showing needs no more than the current one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageRepository, translate]);

  return null;
};
