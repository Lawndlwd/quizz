import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react';

/** Immutably move an array item from one index to another. */
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Lib-free drag-to-reorder for a vertical list, using Pointer Events so it works
 * with mouse + touch. Shared by the play screen and the studio editor.
 *
 * The dragged row lifts and follows the pointer (`dragStyle`); when the pointer
 * crosses into another row's band the list reorders and the floating row
 * re-anchors under the finger — so you can drag an item straight to any slot in
 * one motion. The pointer is captured on the list container (not the moving
 * row), so reordering never drops the drag.
 *
 * - Spread `listProps` on the container whose *direct children* are the rows.
 * - Spread `handleProps(pos)` on each row's drag handle.
 * - Apply `dragStyle(pos)` to each row (translates the one being dragged).
 * - `dragPos` is the row currently being dragged (for styling), else null.
 *
 * `onMove(from, to)` is called as the drag crosses slots; the caller owns the
 * data (e.g. `setOrder((o) => arrayMove(o, from, to))`).
 */
export function usePointerReorder(onMove: (from: number, to: number) => void, disabled = false) {
  const listRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  // Pointer Y at the current slot's anchor point; reset each time we cross a slot.
  const anchorY = useRef(0);

  function start(e: ReactPointerEvent, pos: number) {
    if (disabled) return;
    e.preventDefault();
    setDragPos(pos);
    setOffset(0);
    anchorY.current = e.clientY;
    listRef.current?.setPointerCapture?.(e.pointerId);
  }

  function move(e: ReactPointerEvent) {
    if (dragPos === null || !listRef.current) return;
    const rows = Array.from(listRef.current.children) as HTMLElement[];
    if (rows.length === 0) return;
    const y = e.clientY;

    // Settled band of each row — for the dragged row, subtract its live translate
    // so detection uses where it *would* sit, not where it's floating.
    const bands = rows.map((r, i) => {
      const rect = r.getBoundingClientRect();
      const shift = i === dragPos ? offset : 0;
      return { top: rect.top - shift, bottom: rect.bottom - shift };
    });

    let target = dragPos;
    if (y <= bands[0].top) {
      target = 0;
    } else if (y >= bands[bands.length - 1].bottom) {
      target = bands.length - 1;
    } else {
      const hit = bands.findIndex((b) => y >= b.top && y <= b.bottom);
      if (hit !== -1) target = hit;
    }

    if (target !== dragPos) {
      onMove(dragPos, target);
      setDragPos(target);
      anchorY.current = y; // re-anchor: the row snaps into the new slot under the finger
      setOffset(0);
    } else {
      setOffset(y - anchorY.current);
    }
  }

  function end() {
    setDragPos(null);
    setOffset(0);
  }

  return {
    dragPos,
    listProps: {
      ref: listRef,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
    },
    handleProps: (pos: number) => ({
      onPointerDown: (e: ReactPointerEvent) => start(e, pos),
      // Keyboard path — pointer drag is unusable for keyboard/switch-access
      // users, so the handle also moves its row with the arrow keys.
      onKeyDown: (e: ReactKeyboardEvent) => {
        if (disabled) return;
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const count = listRef.current?.children.length ?? 0;
        const to = pos + (e.key === 'ArrowUp' ? -1 : 1);
        if (to < 0 || to >= count) return;
        onMove(pos, to);
      },
      'aria-keyshortcuts': 'ArrowUp ArrowDown',
    }),
    dragStyle: (pos: number): CSSProperties | undefined =>
      pos === dragPos
        ? { transform: `translateY(${offset}px)`, transition: 'none', zIndex: 20 }
        : undefined,
  };
}
