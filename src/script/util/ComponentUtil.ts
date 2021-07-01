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

import ko, {Unwrapped} from 'knockout';
import {useEffect, useState} from 'react';
interface RegisterReactComponent<Props> {
  component: React.ComponentType<Props>;
}

interface RegisterReactComponentWithTemplate<T> extends RegisterReactComponent<T> {
  bindings?: never;
  template: string;
}

interface RegisterReactComponentWithBindings<T> extends RegisterReactComponent<T> {
  bindings: string;
  template?: never;
}

export function registerReactComponent<Props>(
  name: string,
  {
    template,
    bindings,
    component,
  }: RegisterReactComponentWithBindings<Props> | RegisterReactComponentWithTemplate<Props>,
) {
  ko.components.register(name, {
    template: template ?? `<!-- ko react: {${bindings}} --><!-- /ko -->`,
    viewModel: function (knockoutParams: Props) {
      const bindingsString = bindings ?? /react: ?{([^]*)}/.exec(template)[1];
      const pairs = bindingsString?.split(',');
      const neededParams = pairs?.map(pair => {
        const [name, value = name] = pair.split(':');
        return value.replace(/ko\.unwrap\(|\)/g, '').trim();
      }) as (keyof Props)[];

      neededParams.forEach(param => {
        if (!knockoutParams.hasOwnProperty(param)) {
          knockoutParams[param] = undefined;
        }
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

type Subscribables<T> = {
  [Key in keyof T]: T[Key] extends ko.Subscribable ? T[Key] : never;
};

type UnwrappedValues<T, S = Subscribables<T>> = {
  [Key in keyof S]: Unwrapped<S[Key]>;
};

export const useKoSubscribableChildren = <C extends keyof Subscribables<P>, P extends Record<C, ko.Subscribable>>(
  parent: P,
  children: C[],
): UnwrappedValues<P> => {
  const getInitialState = (root: P): UnwrappedValues<P> =>
    children.reduce((acc, child) => {
      acc[child] = root?.[child]?.();
      return acc;
    }, {} as UnwrappedValues<P>);

  const [state, setState] = useState<UnwrappedValues<P>>(getInitialState(parent));
  useEffect(() => {
    setState(getInitialState(parent));
    const subscriptions = children.map(child => {
      const subscribable = parent?.[child];
      return subscribable?.subscribe((value: Unwrapped<typeof subscribable>) => {
        setState(prevState => ({...prevState, [child]: value}));
      });
    });
    return () => subscriptions.forEach(subscription => subscription?.dispose());
  }, [parent]);

  return state;
};
