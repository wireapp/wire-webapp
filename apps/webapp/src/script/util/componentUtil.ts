/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import ko, {Unwrapped} from 'knockout';

type Subscribables<T> = {
  [Key in keyof T]: T[Key] extends ko.Subscribable ? T[Key] : never;
};

type UnwrappedValues<T, S = Subscribables<T>> = {
  [Key in keyof S]: Unwrapped<S[Key]>;
};

const resolveObservables = <C extends keyof Subscribables<P>, P extends Partial<Record<C, ko.Subscribable>>>(
  object: P,
  children?: C[],
): UnwrappedValues<P> => {
  const properties = children ?? (Object.keys(object).filter(key => key !== '$raw') as C[]);
  return properties.reduce<UnwrappedValues<P>>((acc, child) => {
    acc[child] = ko.unwrap(object?.[child]);
    return acc;
  }, {} as UnwrappedValues<P>);
};

/**
 * Will subscribe to all the observable properties of the object and call the onUpdate callback everytime one observable updates
 *
 * @param object The object containinig some observable properties
 * @param onUpdate The callback called everytime an observable emits. It will only give back the slice of the object that have updates
 * @param children? An optional list of properties to watch (by default will watch for all the observable properties)
 */
const subscribeProperties = <C extends keyof Subscribables<P>, P extends Partial<Record<C, ko.Subscribable>>>(
  object: P,
  onUpdate: (updates: Partial<UnwrappedValues<P>>) => void,
  children?: C[],
) => {
  const properties = children ?? (Object.keys(object).filter(key => key !== '$raw') as C[]);
  onUpdate(resolveObservables(object, children));

  const subscriptions = properties
    .filter(child => ko.isSubscribable(object?.[child]))
    .map(child => {
      const subscribable = object[child];
      return subscribable?.subscribe((value: Unwrapped<typeof subscribable>) => {
        onUpdate({[child]: value} as Partial<UnwrappedValues<P>>);
      });
    });

  return {
    dispose: () => subscriptions.forEach(subscription => subscription?.dispose()),
  };
};

export const useKoSubscribableChildren = <
  C extends keyof Subscribables<P>,
  P extends Partial<Record<C, ko.Subscribable>>,
>(
  parent: P,
  children: C[],
): UnwrappedValues<Pick<P, C>> => {
  const [state, setState] = useState<UnwrappedValues<P>>(resolveObservables(parent, children));
  useEffect(() => {
    const subscription = subscribeProperties(
      parent,
      updates => setState(currentState => ({...currentState, ...updates})),
      children,
    );
    return () => subscription.dispose();
  }, [parent]);

  return state;
};
