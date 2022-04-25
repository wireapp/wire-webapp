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
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
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

/**
 * Registers a static react component against the ko world.
 * A Static component is a component that will not get updates for the observables directly given to it.
 * It can still react to nested observables given by using the `useKoSubribableChildren` hook.
 * A Static component is much optimal, in term of performance, that calling registerReactComponent (that will get a full state update everytime an observable changes).
 *
 * @param name Name of the component to register. can be used a `<component-name>` directly in ko
 * @param {component}
 */
export function registerStaticReactComponent<Props>(name: string, component: React.ComponentType<Props>) {
  if (ko.components.isRegistered(name)) {
    return;
  }

  ko.components.register(name, {
    template: '<!-- -->', // We do not need any particular template as this is going to be replaced by react content
    viewModel: {
      createViewModel: (params: Props, {element}: {element: HTMLElement}) => {
        const unwrappedParams: Props = Object.entries(params)
          .filter(([key]) => key !== '$raw') // Filter ko default $raw values
          .reduce((acc, [key, value]) => {
            return {...acc, [key]: ko.unwrap(value)};
          }, {} as Props);
        const root = createRoot(element);
        root.render(React.createElement(component, unwrappedParams));

        return {
          dispose() {
            root.unmount();
          },
        };
      },
    },
  });
}

/**
 * Registers a react component that will get a full state update every time parameter observable gets an update.
 *
 * @deprecated Please use `registerStaticReactComponent` instead. Just use it if you need observable updates from direct parameters
 *   eg. `<component params="myObservable">` if you need your component to update when `myObservable` changes, you will need this function
 * @param name Name of the component to register. can be used a `<component-name>` directly in ko
 * @param {component}
 */
export function registerReactComponent<Props>(
  name: string,
  {
    template,
    bindings,
    component,
  }: RegisterReactComponentWithBindings<Props> | RegisterReactComponentWithTemplate<Props>,
) {
  if (!ko.components.isRegistered(name)) {
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
}

type Subscribables<T> = {
  [Key in keyof T]: T[Key] extends ko.Subscribable ? T[Key] : never;
};

type UnwrappedValues<T, S = Subscribables<T>> = {
  [Key in keyof S]: Unwrapped<S[Key]>;
};

export const useKoSubscribableChildren = <
  C extends keyof Subscribables<P>,
  P extends Partial<Record<C, ko.Subscribable>>,
>(
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
