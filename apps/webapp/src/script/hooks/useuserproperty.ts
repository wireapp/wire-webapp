/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useEffect, useCallback, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

/**
 * This hook is used to subscribe to a property of the user and update the state of the component when the property changes.
 * @param getProperty a function that will get the property value when called
 * @param updateEvent the event that will trigger the update of the property
 */
export const useUserPropertyChange = <T>(
  getProperty: () => T,
  updateEvent: string,
  onChange: (value: T) => void,
): void => {
  const updateProperty = useCallback(() => {
    onChange(getProperty());
  }, [getProperty, onChange]);

  useEffect(() => {
    const listenedEvents = [updateEvent, WebAppEvents.PROPERTIES.UPDATED];
    listenedEvents.forEach(event => amplify.subscribe(event, updateProperty));
    return () => {
      listenedEvents.forEach(event => amplify.unsubscribe(event, updateProperty));
    };
  }, [updateEvent, updateProperty]);
};

export const useUserPropertyValue = <T>(getProperty: () => T, updateEvent: string): T => {
  const [propertyValue, setPropertyValue] = useState(getProperty());

  useUserPropertyChange(getProperty, updateEvent, setPropertyValue);

  return propertyValue;
};
