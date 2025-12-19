# Accessibility Practices for Wire

Must-have guidance for building accessible features across Wire web repos. Each rule includes a short snippet you can copy or adapt.

## 1) Keyboard-first controls

### Rule

Every control is reachable and operable with keyboard alone; custom widgets respect arrows/Enter/Space/Escape. Menu items should be accessible too and loop (last item + ArrowDown -> first item; first item + ArrowUp -> last item).

### Example (context menu)

```tsx
// electron/renderer/src/components/context/ContextMenu.tsx
// Menus: move focus to the first menu item and keep the wrapper out of tab order
<div role="menu" tabIndex={-1} className="ContextMenu" ref={menuRef} onKeyDown={handleMenuKeyDown}>
  {children}
</div>
```

## 2) Focus you can follow

### Rule

Focus is visible, moves into overlays on open, and returns to the trigger on close; trap focus only in blocking modals.

### Example (return focus to trigger)

```tsx
// electron/renderer/src/components/context/AddAccountTrigger.tsx
const triggerRef = useRef<HTMLButtonElement>(null);

const closeMenu = () => {
  setOpen(false);
  triggerRef.current?.focus(); // restore focus to trigger
};
```

## 3) Clear semantics and state

### Rule

Prefer native elements; for custom UI, set roles, names, and states that reflect reality.

### Example (toggle button)

```tsx
<button aria-pressed={isPinned} aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'} onClick={togglePin}>
  <PinIcon />
</button>
```

## 4) Honest colour and contrast

### Rule

Meet WCAG contrast (4.5:1 text, 3:1 large/UI chrome) and keep strong focus outlines.

### Example

Follow mocks and verify contrast across states.

## 5) Forms that speak

### Rule

Labels connect to inputs; helper text for formats; errors are announced and not colour-only.

### Example

```tsx
<label htmlFor="email">Work email</label>

<input id="email" name="email" aria-invalid={!!error} aria-describedby="email-error" />
{error && (
  <div id="email-error" role="alert">
    {error}
  </div>
)}
```

## 6) Live updates done right

### Rule

Use polite live regions for non-blocking updates; assertive only for urgent cases; keep announcements short.

### Example

```tsx
<div aria-live="polite" className="sr-only">
  {sendStatus === 'sent' && 'Message sent'}
  {sendStatus === 'failed' && 'Message failed. Retry.'}
</div>
```

## 7) Responsive and scalable

### Rule

Support zoom/dynamic type; prefer rem/em/flex/grid; avoid clipping text with fixed heights.

### Example

```css
.sidebarItem {
  padding: 0.75rem 1rem;
  min-height: 2.75rem;
}
```

## 8) Roving focus for arrow navigation

### Rule

Use a roving tab index for composite widgets (menus, lists) so only one item is tabbable while arrows move focus.

### Example

Use the `useRoveFocus` hook in web-app for implementation details (handles ArrowUp/ArrowDown loops and active item tab index).

## 9) Focus trap in modals

### Rule

Blocking modals must trap focus inside while open, restore focus on close, and announce themselves. Team Settings uses `focus-trap-react`, a lightweight wrapper around `focus-trap`.

### Example

```tsx
import FocusTrap from 'focus-trap-react';

<FocusTrap>
  <div id="modal-dialog" className="modal" role="dialog" aria-modal="true">
    <button>Ok</button>
    <button>Cancel</button>
  </div>
</FocusTrap>;
```

## 10) Loading and progress

### Rule

Communicate loading states and progress with text and, when backgrounded, a polite live region.

### Example

```tsx
<button aria-busy={isLoading} aria-live="polite">
  {isLoading ? 'Loading…' : 'Continue'}
</button>
```

## 11) Icon-only controls

### Rule

Icon buttons and toggles expose an action-focused name via `aria-label` or `title`.

### Example

```tsx
<button aria-label="Start call" onClick={startCall}>
  <PhoneIcon aria-hidden="true" />
</button>
```

## 12) Tooltips

### Rule

Critical info is not hover-only; tooltips open on hover and focus and do not take focus.

### Example

```tsx
<button
  aria-describedby="pin-tooltip"
  onMouseEnter={() => setShow(true)}
  onMouseLeave={() => setShow(false)}
  onFocus={() => setShow(true)}
  onBlur={() => setShow(false)}
>
  <PinIcon />
</button>;
{
  show && (
    <div role="tooltip" id="pin-tooltip">
      Pin conversation
    </div>
  );
}
```

## 13) Text truncation

### Rule

Avoid truncating labels/controls; if ellipsis is required, expose the full text.

### Example

```tsx
<span className="label" title={name} aria-label={name}>
  {name}
</span>
```

```css
.label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

## 14) Announce async/system states

### Rule

Network/offline/reconnect, uploads, and retries surface through a polite live region.

### Example

```tsx
<div aria-live="polite" className="sr-only">
  {isOffline && 'You are offline. Messages will send when connected.'}
  {uploadProgress > 0 && `Upload ${uploadProgress}%`}
</div>
```

## 15) Semantic landmarks

### Rule

Each view uses consistent header/nav/main/footer landmarks.

### Example

```tsx
export const Layout = ({children}: {children: React.ReactNode}) => (
  <>
    <header>...</header>
    <nav aria-label="Primary">...</nav>
    <main id="main-content">{children}</main>
    <footer>...</footer>
  </>
);
```
