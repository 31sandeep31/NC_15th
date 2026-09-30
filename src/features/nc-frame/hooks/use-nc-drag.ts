import { useCallback, useRef } from "react";

import type { SelectedTextId } from "../lib/types";

type DragCallbacks = {
  clamp: boolean;
  onDrag: (id: SelectedTextId, dx: number, dy: number) => void;
  onDragEnd: () => void;
  clampDragDelta: (
    target: HTMLElement,
    dx: number,
    dy: number,
  ) => { dx: number; dy: number };
};

export function useNcDrag(callbacks: DragCallbacks) {
  const dragTargetRef = useRef<SelectedTextId>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const { clamp, clampDragDelta, onDrag, onDragEnd } = callbacks;

  const getDragProps = useCallback(
    (id: SelectedTextId, options?: { clamp?: boolean }) => {
      const shouldClamp = options?.clamp ?? clamp;

      return {
        onPointerCancel: (event: React.PointerEvent<HTMLElement>) => {
          if (dragTargetRef.current !== id) return;
          dragTargetRef.current = null;
          releaseCapture(event.currentTarget, event.pointerId);
        },
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();
          dragTargetRef.current = id;
          startXRef.current = event.clientX;
          startYRef.current = event.clientY;
          const el = event.currentTarget;
          el.setPointerCapture(event.pointerId);
          el.classList.add("cursor-grabbing");
          el.classList.remove("cursor-grab");
        },
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
          if (dragTargetRef.current !== id) return;
          const dx = event.clientX - startXRef.current;
          const dy = event.clientY - startYRef.current;
          const next = shouldClamp
            ? clampDragDelta(event.currentTarget, dx, dy)
            : { dx, dy };
          onDrag(id, next.dx, next.dy);
          startXRef.current = event.clientX;
          startYRef.current = event.clientY;
        },
        onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
          if (dragTargetRef.current !== id) return;
          dragTargetRef.current = null;
          const el = event.currentTarget;
          el.classList.remove("cursor-grabbing");
          el.classList.add("cursor-grab");
          releaseCapture(el, event.pointerId);
          onDragEnd();
        },
      };
    },
    [clamp, clampDragDelta, onDrag, onDragEnd],
  );

  return { getDragProps };
}

function releaseCapture(el: HTMLElement, pointerId: number) {
  if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
}
