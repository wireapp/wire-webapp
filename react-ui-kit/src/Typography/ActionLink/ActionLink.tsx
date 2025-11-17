/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import * as React from 'react';
import {forwardRef} from 'react';

import {CSSObject} from '@emotion/react';

import {styles as actionLinkButtonStyles} from './ActionLinkButton.style';

import {COLOR_V2} from '../../Identity/colors-v2/colors-v2';
import {Theme} from '../../Identity/Theme';
import {LinkProps, linkStyle, filterLinkProps} from '../Link';

type VisualProps = Pick<LinkProps, 'bold' | 'color' | 'fontSize' | 'textTransform'> & {
  disabled?: boolean;
  children: React.ReactNode;
};

type AnchorVariant = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'disabled'> & {
  href: string;
};

type ButtonVariant = {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export type ActionLinkButtonProps = VisualProps & (AnchorVariant | ButtonVariant);

export type LinkStyleProps<T = HTMLAnchorElement> = LinkProps<T>;

export const ActionLinkButton = forwardRef<HTMLAnchorElement | HTMLButtonElement, ActionLinkButtonProps>(
  (props, ref) => {
    const {
      bold = false,
      color = COLOR_V2.BLACK,
      fontSize,
      textTransform = 'none',
      disabled,
      children,
      ...restProps
    } = props;

    const baseCss = (theme: Theme) =>
      ({
        ...linkStyle(theme, {
          bold,
          color,
          fontSize: fontSize ?? theme.fontSizes.base,
          textTransform,
        } as LinkProps),
        ...actionLinkButtonStyles.link.base,
        ...(disabled ? actionLinkButtonStyles.link.disabled : actionLinkButtonStyles.link.enabled),
      }) satisfies CSSObject;

    if ('href' in restProps && restProps.href) {
      const {href, target, onClick, ...anchorProps} = restProps;
      const linkProps = filterLinkProps(anchorProps as unknown as LinkProps);

      const handleAnchorClick: React.MouseEventHandler<HTMLAnchorElement> = e => {
        if (disabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e as any);
      };

      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          css={(theme: Theme) => baseCss(theme)}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          onClick={handleAnchorClick}
          {...linkProps}
        >
          {children}
        </a>
      );
    }

    const {onClick, ...btnProps} = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        disabled={disabled || btnProps.disabled}
        onClick={onClick}
        css={(theme: Theme) => [actionLinkButtonStyles.buttonReset, baseCss(theme)]}
        {...btnProps}
      >
        {children}
      </button>
    );
  },
);

ActionLinkButton.displayName = 'ActionLinkButton';
