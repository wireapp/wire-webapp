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

/**
 * Registers a react component against the ko world.
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
        let state: Props = resolveObservables(params);
        const subscription = subscribeProperties(params, updates => {
          state = {...state, ...updates};
          ReactDOM.render(React.createElement(component, state), element);
        });
        return {
          dispose() {
            ReactDOM.unmountComponentAtNode(element);
            subscription.dispose();
          },
        };
      },
    },
  });
}

/**
- * Registers a react component that will get a full state update every time parameter observable gets an update.
- *
- * @deprecated Please use `registerStaticReactComponent` instead. Just use it if you need observable updates from direct parameters
- * @param name Name of the component to register. can be used a `<component-name>` directly in ko
- * @param {component}
- */
export function registerReactComponent<Props>(name: string, {component}: {component: React.ComponentType<Props>}) {
  return registerStaticReactComponent(name, component);
}

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
      let batchedUpdates = {};
      let batchTimeout: NodeJS.Timeout;
      return subscribable?.subscribe((value: Unwrapped<typeof subscribable>) => {
        clearTimeout(batchTimeout);
        batchedUpdates = {...batchedUpdates, [child]: value};
        batchTimeout = setTimeout(() => {
          onUpdate(batchedUpdates);
          batchedUpdates = {};
        });
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
): UnwrappedValues<P> => {
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
