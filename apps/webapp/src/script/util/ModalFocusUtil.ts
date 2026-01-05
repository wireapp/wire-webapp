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

interface ModalFocusContext {
  /**
   * The document to use for capturing the active element (defaults to global document)
   */
  targetDocument?: Document;

  /**
   * The container element where the modal will be rendered (e.g., for detached windows)
   */
  container?: HTMLElement;
}

interface ModalFocusResult {
  /**
   * The target document to use for modal operations
   */
  targetDocument: Document;

  /**
   * The container element where the modal will be rendered (undefined for main window)
   */
  container?: HTMLElement;

  /**
   * Creates a focus restoration callback that should be called when the modal closes
   *
   * @param additionalCallback - Optional callback to execute before restoring focus
   * @returns Callback function to restore focus to the previously focused element
   */
  createFocusRestorationCallback: (additionalCallback?: () => void) => () => void;
}

/**
 * Captures the current focus context for a modal before it's shown.
 *
 * @param context - Optional context to specify target document or container
 * @returns Object containing document, container, and focus restoration callback creator
 */
export function captureModalFocusContext(context: ModalFocusContext = {}): ModalFocusResult {
  const targetDocument = context.targetDocument || document;

  // Capture the currently focused element at the time this function is called
  const previouslyFocusedElement = targetDocument.activeElement as HTMLElement | null;

  return {
    targetDocument,
    container: context.container,
    createFocusRestorationCallback: (additionalCallback?: () => void) => () => {
      // Execute additional callback if provided
      if (additionalCallback) {
        try {
          additionalCallback();
        } catch (error) {
          console.error('Error in modal close callback:', error);
        }
      }

      // Restore focus to the previously focused element
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        try {
          // Check if the element is still in the document before focusing
          if (
            document.contains(previouslyFocusedElement) ||
            (context.targetDocument && context.targetDocument.contains(previouslyFocusedElement))
          ) {
            previouslyFocusedElement.focus();
          }
        } catch (error) {
          // Silently handle focus errors (e.g., element no longer in DOM)
          console.error('Failed to restore focus to element:', error);
        }
      }
    },
  };
}
