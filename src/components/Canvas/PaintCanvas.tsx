"use client";

import React, { useEffect, useRef } from "react";
import { fabric } from "fabric";

interface PaintCanvasProps {
  brushColor: string;
  brushSize: number;
  isDrawing: boolean;
  brushType: "pencil" | "circle" | "spray" | "eraser";
  canvasRefCallback?: (canvas: fabric.Canvas) => void;
}

function getTouchDist(t1: Touch, t2: Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMid(t1: Touch, t2: Touch) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

/** Clear Fabric's upper-canvas (in-progress stroke) and abort any active drawing. */
function abortFabricDrawing(canvas: fabric.Canvas) {
  try {
    // Clear the overlay canvas where in-progress strokes are rendered
    (canvas as any).clearContext((canvas as any).contextTop);
    (canvas as any)._isCurrentlyDrawing = false;
  } catch (_) {
    /* ignore internal API differences */
  }
  canvas.renderAll();
}

export default function PaintCanvas({
  brushColor,
  brushSize,
  isDrawing,
  brushType,
  canvasRefCallback,
}: PaintCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  // Pinch state — refs only (no re-render needed)
  const isPinchingRef = useRef(false);
  const lastDistRef = useRef(0);
  const lastMidRef = useRef({ x: 0, y: 0 });
  // Minimum zoom = initial zoom so the canvas never appears smaller than the device screen
  const minZoomRef = useRef(0.1);
  // Track the isDrawing prop inside refs so touch handlers always see the latest value
  const isDrawingRef = useRef(isDrawing);
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  // ── Canvas initialisation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#f5f5f5",
      isDrawingMode: true,
      preserveObjectStacking: true,
      // Disable Fabric's own gesture handling — we manage it ourselves
      allowTouchScrolling: false,
    });

    fabricRef.current = canvas;
    if (canvasRefCallback) canvasRefCallback(canvas);

    // Capture whatever zoom page.tsx set as the minimum — so user can never
    // zoom out past the initial "fit to screen" view.
    // Use a microtask so setZoom() inside canvasRefCallback has settled.
    Promise.resolve().then(() => {
      minZoomRef.current = canvas.getZoom();
    });

    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = canvas.getActiveObjects();
        if (active.length) {
          canvas.discardActiveObject();
          active.forEach((obj) => {
            if (!obj.lockMovementX) canvas.remove(obj);
          });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Touch interception — CAPTURE phase so we get events BEFORE Fabric ─────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    /**
     * Strategy:
     *   • Attach in CAPTURE phase → our handler fires before Fabric's canvas listeners.
     *   • When 2+ fingers detected: call stopImmediatePropagation() so Fabric
     *     never sees the event, then clear any in-progress stroke.
     *   • When <2 fingers and not pinching: do nothing → Fabric handles normally.
     */

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // always block browser pinch-zoom / scroll

      if (e.touches.length >= 2) {
        // Enter pinch mode — block Fabric from seeing this event
        e.stopImmediatePropagation();
        isPinchingRef.current = true;

        const canvas = fabricRef.current;
        if (canvas) {
          canvas.isDrawingMode = false;
          abortFabricDrawing(canvas);
          canvas.discardActiveObject();
        }

        const [t1, t2] = [e.touches[0], e.touches[1]];
        lastDistRef.current = getTouchDist(t1, t2);
        lastMidRef.current = getTouchMid(t1, t2);
      } else {
        // Single finger: ensure we exit pinch state cleanly
        if (isPinchingRef.current) {
          e.stopImmediatePropagation();
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (!isPinchingRef.current) return;
      // Block Fabric from seeing moves during pinch
      e.stopImmediatePropagation();

      const canvas = fabricRef.current;
      if (!canvas || e.touches.length < 2) return;

      const [t1, t2] = [e.touches[0], e.touches[1]];
      const newDist = getTouchDist(t1, t2);
      const newMid = getTouchMid(t1, t2);

      // ─ Zoom to midpoint ─────────────────────────────────────────────
      const scale = newDist / lastDistRef.current;
      const currentZoom = canvas.getZoom();
      const newZoom = Math.min(
        Math.max(currentZoom * scale, minZoomRef.current),
        8,
      );
      canvas.zoomToPoint(new fabric.Point(newMid.x, newMid.y), newZoom);

      // ─ Pan ──────────────────────────────────────────────────────────
      const dx = newMid.x - lastMidRef.current.x;
      const dy = newMid.y - lastMidRef.current.y;
      canvas.relativePan(new fabric.Point(dx, dy));

      lastDistRef.current = newDist;
      lastMidRef.current = newMid;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isPinchingRef.current) return;
      e.preventDefault();
      // Block Fabric from committing the abandoned stroke
      e.stopImmediatePropagation();

      if (e.touches.length < 2) {
        isPinchingRef.current = false;

        const canvas = fabricRef.current;
        if (canvas) {
          // Clear any ghost stroke Fabric may have partially rendered
          abortFabricDrawing(canvas);

          // Restore drawing mode after a brief delay so the final
          // finger-lift touch doesn't register as a draw tap
          setTimeout(() => {
            const c = fabricRef.current;
            if (c && !isPinchingRef.current) {
              c.isDrawingMode = isDrawingRef.current;
            }
          }, 120);
        }
      }
    };

    const onTouchCancel = (e: TouchEvent) => onTouchEnd(e);

    // ⚠️  CAPTURE: true — fires before Fabric's bubble-phase listeners
    wrapper.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: false,
    });
    wrapper.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: false,
    });
    wrapper.addEventListener("touchend", onTouchEnd, {
      capture: true,
      passive: false,
    });
    wrapper.addEventListener("touchcancel", onTouchCancel, {
      capture: true,
      passive: false,
    });

    return () => {
      wrapper.removeEventListener("touchstart", onTouchStart, {
        capture: true,
      });
      wrapper.removeEventListener("touchmove", onTouchMove, { capture: true });
      wrapper.removeEventListener("touchend", onTouchEnd, { capture: true });
      wrapper.removeEventListener("touchcancel", onTouchCancel, {
        capture: true,
      });
    };
  }, []); // stable — uses refs

  // ── Brush / drawing mode sync ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (!isPinchingRef.current) {
      canvas.isDrawingMode = isDrawing;
    }

    const enforceLockedLayering = () => {
      canvas.getObjects().forEach((obj) => {
        if (obj.lockMovementX) obj.bringToFront();
      });
    };

    canvas.getObjects().forEach((obj) => {
      if (obj.lockMovementX) obj.evented = !isDrawing;
    });

    enforceLockedLayering();
    canvas.requestRenderAll();

    canvas.on("path:created", enforceLockedLayering);
    canvas.on("object:modified", enforceLockedLayering);

    if (isDrawing && !isPinchingRef.current) {
      let brush: fabric.BaseBrush;
      switch (brushType) {
        case "circle":
          // @ts-ignore
          brush = new fabric.CircleBrush(canvas);
          brush.color = brushColor;
          break;
        case "spray":
          // @ts-ignore
          brush = new fabric.SprayBrush(canvas);
          brush.color = brushColor;
          break;
        case "eraser":
          brush = new fabric.PencilBrush(canvas);
          brush.color = "#f5f5f5";
          break;
        default:
          brush = new fabric.PencilBrush(canvas);
          brush.color = brushColor;
      }
      brush.width = brushSize;
      canvas.freeDrawingBrush = brush;
    }

    return () => {
      canvas.off("path:created", enforceLockedLayering);
      canvas.off("object:modified", enforceLockedLayering);
    };
  }, [fabricRef.current, brushColor, brushSize, isDrawing, brushType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Color fill on selection change ────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isDrawing) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    if (activeObject instanceof fabric.Path) {
      activeObject.set("stroke", brushColor);
    } else {
      activeObject.set("fill", brushColor);
      if (activeObject instanceof fabric.Group) {
        activeObject.getObjects().forEach((obj) => {
          if (obj instanceof fabric.Path) obj.set("stroke", brushColor);
          else obj.set("fill", brushColor);
        });
      }
    }
    canvas.requestRenderAll();
  }, [brushColor, isDrawing]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-screen overflow-hidden bg-gray-100"
      // touch-action:none tells the browser to hand all touch events to JS
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
