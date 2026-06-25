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

import {useEffect} from 'react';

import ko from 'knockout';
import {container} from 'tsyringe';

import {UserState} from 'Repositories/user/userstate';
import {ACCENT_ID} from 'src/script/config';

function setAccentColor(accentColor?: number) {
  const accentColorClassId = accentColor ?? ACCENT_ID.BLUE;
  const accentClassPrefix = 'main-accent-color-';
  const bodyClassList = document.body.classList;
  const accentClasses = Array.from(bodyClassList).filter(existingClassName => {
    return existingClassName.startsWith(accentClassPrefix);
  });

  accentClasses.forEach(existingAccentClass => {
    bodyClassList.remove(existingAccentClass);
  });

  bodyClassList.add(`${accentClassPrefix}${accentColorClassId}`);
}

export function useAccentColor() {
  const userState = container.resolve(UserState);
  useEffect(() => {
    const accentColor = ko.pureComputed(() => {
      const selfUser = userState.self();
      return selfUser?.accent_id();
    });
    setAccentColor(accentColor());
    const subscription = accentColor.subscribe(accentColorValue => {
      setAccentColor(accentColorValue);
    });
    return () => {
      return subscription.dispose();
    };
  }, []);
}
