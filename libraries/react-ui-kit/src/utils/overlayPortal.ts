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

/** Matches react-aria overlay z-index (100000) with headroom for nested Storybook story layers. */
export const overlayPortalZIndex = 10000020;

export const OVERLAY_PORTAL_ROOT_ID = 'wire-react-ui-kit-overlay-root';

/**
 * Returns a dedicated overlay root appended to `document.body`.
 * RAC popovers portal into this node so their z-index competes at the body level
 * (not trapped inside react-aria's static portal wrapper).
 */
export const getOverlayPortalContainer = (): HTMLElement | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  let root = document.getElementById(OVERLAY_PORTAL_ROOT_ID);

  if (root === null || root === undefined) {
    root = document.createElement('div');
    root.id = OVERLAY_PORTAL_ROOT_ID;
    root.setAttribute('data-wire-overlay-root', '');
    root.style.position = 'relative';
    root.style.zIndex = String(overlayPortalZIndex);
    document.body.appendChild(root);
  } else if (root.parentElement === document.body && document.body.lastElementChild !== root) {
    document.body.appendChild(root);
  }

  return root;
};
