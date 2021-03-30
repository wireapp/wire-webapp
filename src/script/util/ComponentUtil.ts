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

import ko from 'knockout';
import {useEffect, useState} from 'react';
import {container, InjectionToken} from 'tsyringe';
import {TypeUtil} from '@wireapp/commons';

export function registerReactComponent<Props>(
  name: string,
  {
    template,
    component,
    optionalParams = [],
    injected = {},
  }: {
    component: React.ComponentType<Props>;
    injected?: Record<string, InjectionToken>;
    /** The optional knockout params */
    optionalParams?: TypeUtil.OptionalKeys<Props>[];
    template: string;
  },
) {
  ko.components.register(name, {
    template,
    viewModel: function (knockoutParams: Props) {
      optionalParams.forEach(param => {
        if (!knockoutParams.hasOwnProperty(param)) {
          knockoutParams[param] = undefined;
        }
      });
      Object.entries(injected).forEach(([injectedName, injectedClass]) => {
        knockoutParams[injectedName as keyof Props] = container.resolve(injectedClass);
      });
      Object.assign(this, knockoutParams);
      this.reactComponent = component;
    },
  });
}

export const useKoSubscribableCallback = <T = any>(
  observable: ko.Subscribable<T>,
  callback: (newValue: T) => void,
): void => {
  useEffect(() => {
    const subscription = observable.subscribe(newValue => callback(newValue));
    return () => subscription.dispose();
  }, [observable]);
};

export const useKoSubscribable = <T = any>(observable: ko.Subscribable<T>, defaultValue?: T): T => {
  const [value, setValue] = useState<T>(observable() ?? defaultValue);
  useKoSubscribableCallback(observable, newValue => setValue(newValue));
  return value;
};

type ChildValues<T extends string | number | symbol> = Record<T, any>;

type Subscribables<T> = {
  [Key in keyof T]: T[Key] extends ko.Subscribable ? T[Key] : never;
};

export const useKoSubscribableChildren = <C extends keyof Subscribables<P>, P extends Record<C, ko.Subscribable>>(
  parent: P,
  children: C[],
): ChildValues<C> => {
  const getInitialState = (root: P): ChildValues<C> =>
    children.reduce((acc, child) => {
      acc[child] = root[child]?.();
      return acc;
    }, {} as ChildValues<C>);

  const [state, setState] = useState<ChildValues<C>>(getInitialState(parent));
  useEffect(() => {
    setState(getInitialState(parent));
    const subscriptions = children.map(child =>
      parent[child]?.subscribe((value: any) => {
        setState({...state, [child]: value});
      }),
    );
    return () => subscriptions.forEach(subscription => subscription?.dispose());
  }, [parent]);

  return state;
};
