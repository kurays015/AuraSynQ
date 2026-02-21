"use client";

import sdk from "@farcaster/miniapp-sdk";
import dynamic from "next/dynamic";
import React, { useState, useRef, useEffect, useCallback } from "react";
import GalleryModal from "@/components/Gallery/GalleryModal";
import { useArtworkStorage } from "@/hooks/useArtworkStorage";

// Dynamic import for Canvas to avoid SSR issues with Fabric.js
const PaintCanvas = dynamic(() => import("@/components/Canvas/PaintCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100 text-gray-500">
      Loading Canvas...
    </div>
  ),
});

export default function Home() {
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(true);
  const [brushType, setBrushType] = useState<
    "pencil" | "circle" | "spray" | "eraser"
  >("pencil");
  const [canvasInstance, setCanvasInstance] = useState<any>(null);

  // UI State
  const [showUI, setShowUI] = useState(true);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);

  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isUndoingRef = useRef(false);
  const isRedoingRef = useRef(false);

  // Gallery State
  const [currentArtworkId, setCurrentArtworkId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [saveToast, setSaveToast] = useState<"" | "saving" | "saved">("");
  const { artworks, saveArtwork, deleteArtwork } = useArtworkStorage();

  const [isInMiniApp, setIsInMiniApp] = useState<boolean | null>(null);
  const [user, setUser] = useState<Awaited<typeof sdk.context>["user"] | null>(
    null,
  );
  const [initError, setInitError] = useState<string>("");
  const production = process.env.NODE_ENV === "production" ? true : false;

  // Base App initialization
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        sdk.actions.ready();
        const inMiniApp = await sdk.isInMiniApp();
        if (!isMounted) return;

        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          const context = await sdk.context;
          if (!isMounted) return;
          setUser(context.user ?? null);
        }
      } catch (err) {
        if (!isMounted) return;
        setInitError(
          err instanceof Error ? err.message : "Mini-app init failed.",
        );
        console.error("[AuraSynQ] Init error:", err);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Bind events for history and selection
  useEffect(() => {
    if (!canvasInstance) return;

    // Save initial empty state
    const initialState = JSON.stringify(canvasInstance.toJSON());
    setHistory([initialState]);

    const saveToHistory = () => {
      if (isUndoingRef.current || isRedoingRef.current) return;

      const json = JSON.stringify(canvasInstance.toJSON());
      setHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === json) return prev;
        const newHistory = [...prev, json];
        if (newHistory.length > 50)
          return newHistory.slice(newHistory.length - 50);
        return newHistory;
      });
      // Any new action invalidates the redo stack
      setRedoStack([]);
    };

    const updateSelection = () => {
      if (!canvasInstance) return;
      const selectedObjects = canvasInstance.getActiveObjects();

      if (selectedObjects.length > 0) {
        setSelectedObject(selectedObjects[0]); // Keep for other logic if needed, or just rely on canvas
        // Determine if ALL selected objects are locked
        const allLocked = selectedObjects.every(
          (obj: any) => obj.lockMovementX,
        );
        setIsLocked(allLocked);
      } else {
        setSelectedObject(null);
        setIsLocked(false);
      }
    };

    const clearSelection = () => {
      setSelectedObject(null);
      setIsLocked(false);
    };

    canvasInstance.on("object:added", saveToHistory);
    canvasInstance.on("object:modified", saveToHistory);
    canvasInstance.on("object:removed", saveToHistory);

    canvasInstance.on("selection:created", updateSelection);
    canvasInstance.on("selection:updated", updateSelection);
    canvasInstance.on("selection:cleared", clearSelection);

    return () => {
      canvasInstance.off("object:added", saveToHistory);
      canvasInstance.off("object:modified", saveToHistory);
      canvasInstance.off("object:removed", saveToHistory);

      canvasInstance.off("selection:created", updateSelection);
      canvasInstance.off("selection:updated", updateSelection);
      canvasInstance.off("selection:cleared", clearSelection);
    };
  }, [canvasInstance]);

  const handleUndo = () => {
    if (!canvasInstance || history.length <= 1) return;

    isUndoingRef.current = true;
    const newHistory = [...history];
    const poppedState = newHistory.pop()!; // state we're leaving
    const previousState = newHistory[newHistory.length - 1];

    setHistory(newHistory);
    setRedoStack((prev) => [...prev, poppedState]); // save for redo

    canvasInstance.loadFromJSON(previousState, () => {
      canvasInstance.renderAll();
      isUndoingRef.current = false;
    });
  };

  const handleRedo = () => {
    if (!canvasInstance || redoStack.length === 0) return;

    isRedoingRef.current = true;
    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.pop()!;

    setRedoStack(newRedoStack);
    setHistory((prev) => [...prev, nextState]);

    canvasInstance.loadFromJSON(nextState, () => {
      canvasInstance.renderAll();
      isRedoingRef.current = false;
    });
  };

  const handleClear = () => {
    if (!canvasInstance) return;

    canvasInstance.clear();
    canvasInstance.backgroundColor = "#f3f4f6"; // gray-100/slate-50 equivalent

    // Save clear state
    const json = JSON.stringify(canvasInstance.toJSON());
    setHistory((prev) => [...prev, json]);
  };

  const toggleLock = () => {
    if (!canvasInstance) return;
    const activeObjects = canvasInstance.getActiveObjects();
    if (!activeObjects || activeObjects.length === 0) return;

    const newLockState = !isLocked;
    setIsLocked(newLockState);

    activeObjects.forEach((obj: any) => {
      obj.set({
        lockMovementX: newLockState,
        lockMovementY: newLockState,
        lockRotation: newLockState,
        lockScalingX: newLockState,
        lockScalingY: newLockState,
        hasControls: !newLockState,
        selectable: true,
        hoverCursor: newLockState ? "not-allowed" : "move",
      });
    });

    // If multiple objects and we are locking, we might want to discard the selection group frame
    // to give a visual cue that they are "static" now?
    // Or keep it so they can be unlocked together.
    // Fabric's default behavior is if objects inside a group are locked, the group itself might still be movable unless we handle it?
    // Actually, if we lock movement of items, the group usually adheres to it if created *after*.
    // But an existing ActiveSelection might need to be discarded and re-selected to pick up changes, or specifically handle the group lock.

    // Simpler approach for now: render all.
    // If we lock, let's discard active object to force user to re-select if they want to unlock,
    // OR better: keep selection but ensure the GROUP doesn't move.

    if (canvasInstance.getActiveObject().type === "activeSelection") {
      canvasInstance.getActiveObject().set({
        lockMovementX: newLockState,
        lockMovementY: newLockState,
        lockRotation: newLockState,
        lockScalingX: newLockState,
        lockScalingY: newLockState,
      });
    }

    canvasInstance.renderAll();

    // Trigger the PaintCanvas enforcement immediately
    canvasInstance.fire("object:modified");
  };

  const handleExport = () => {
    if (!canvasInstance) return;
    const dataURL = canvasInstance.toDataURL({
      format: "png",
      quality: 1,
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "propaint-art.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Gallery handlers ────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!canvasInstance) return;
    setSaveToast("saving");

    // Low-res thumbnail (25%)
    const thumbnail = canvasInstance.toDataURL({
      format: "png",
      quality: 0.7,
      multiplier: 0.25,
    });
    const canvasJSON = JSON.stringify(canvasInstance.toJSON());
    const id = saveArtwork(currentArtworkId, canvasJSON, thumbnail);
    setCurrentArtworkId(id);

    setSaveToast("saved");
    setTimeout(() => setSaveToast(""), 2000);
  }, [canvasInstance, currentArtworkId, saveArtwork]);

  const handleResume = useCallback(
    (artwork: { id: string; canvasJSON: string }) => {
      if (!canvasInstance) return;
      canvasInstance.loadFromJSON(artwork.canvasJSON, () => {
        canvasInstance.renderAll();
        setCurrentArtworkId(artwork.id);
        setShowGallery(false);
        // Reset history with the loaded state
        setHistory([artwork.canvasJSON]);
      });
    },
    [canvasInstance],
  );

  const handleNewArtwork = useCallback(() => {
    if (canvasInstance) {
      canvasInstance.clear();
      canvasInstance.backgroundColor = "#f3f4f6";
      canvasInstance.renderAll();
      const json = JSON.stringify(canvasInstance.toJSON());
      setHistory([json]);
    }
    setCurrentArtworkId(null);
    setShowGallery(false);
  }, [canvasInstance]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvasInstance || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      import("fabric").then(({ fabric }) => {
        fabric.Image.fromURL(data, (img) => {
          if (img.width && img.width > window.innerWidth / 2) {
            img.scaleToWidth(window.innerWidth / 2);
          }
          canvasInstance.add(img);
          canvasInstance.setActiveObject(img);
          setIsDrawing(false);
          setBrushType("pencil");
        });
      });
    };
    reader.readAsDataURL(file);
  };

  // Still detecting environment
  if (isInMiniApp === null && !initError && production) {
    return (
      <div className="flex fixed inset-0 z-50 bg-slate-950 text-white flex-col items-center justify-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-2xl flex items-center justify-center p-3 animate-pulse">
          <img
            src="/icon.png"
            alt="AuraSynQ"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            Initializing AuraSynQ…
          </p>
          <div className="flex gap-1.5 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Not inside Base App
  if ((!isInMiniApp || initError) && production) {
    return (
      <div className="flex fixed inset-0 z-50 bg-slate-950 text-white flex-col items-center justify-center p-8 text-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 blur-2xl scale-110" />
          <div className="relative w-28 h-28 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-2xl flex items-center justify-center p-5">
            <img
              src="/icon.png"
              alt="AuraSynQ"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Access Restricted
          </h1>
          <p className="text-slate-400 max-w-xs text-sm leading-relaxed">
            {initError
              ? initError
              : "AuraSynQ is only available inside the Base app. Open it there to continue."}
          </p>
        </div>
        <a
          href="https://play.google.com/store/search?q=base&c=apps&hl=en"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-full border border-slate-700 bg-slate-800/60 text-xs text-slate-500 font-mono hover:text-slate-300 transition-colors"
        >
          Get the Base App
        </a>
      </div>
    );
  }

  // Inside MiniApp but user context not yet loaded
  if (!user && production) {
    return (
      <div className="flex fixed inset-0 z-50 bg-slate-950 text-white flex-col items-center justify-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-2xl flex items-center justify-center p-3 animate-pulse">
          <img
            src="/icon.png"
            alt="AuraSynQ"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-slate-400 text-sm">Loading your profile…</p>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden font-sans selection:bg-indigo-500 selection:text-white bg-gray-100 text-slate-800">
      <PaintCanvas
        brushColor={brushColor}
        brushSize={brushSize}
        isDrawing={isDrawing}
        brushType={brushType}
        canvasRefCallback={(canvas) => {
          setCanvasInstance(canvas);
          canvas.backgroundColor = "#f3f4f6";
          canvas.setZoom(0.5);
          canvas.renderAll();
        }}
      />

      {/* UI Toggle Button (Always visible) */}
      <button
        onClick={() => setShowUI(!showUI)}
        className={`absolute top-4 right-4 z-30 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 bg-slate-800 text-white hover:bg-slate-700 ${!showUI ? "opacity-50 hover:opacity-100" : ""}`}
        title={showUI ? "Hide UI" : "Show UI"}
      >
        {showUI ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h6v18h-6M10 17l5-5-5-5M13.8 12H3" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3h18v18H3zM9 3v18M15 9l-5 5 5 5M9 14h5" />
          </svg>
        )}
      </button>

      {/* --- LEFT PANEL: TOOLS & ACTIONS --- */}
      <div
        className={`absolute top-4 left-2 flex flex-col gap-2 z-20 transition-all duration-300 ease-in-out items-center ${showUI ? "translate-x-0 opacity-100" : "-translate-x-20 opacity-0 pointer-events-none"}`}
      >
        {/* Main Toolbar */}
        <div className="bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-700 flex flex-col gap-1.5 w-12 items-center text-slate-200">
          {/* Undo / Redo / Clear */}
          <div className="flex flex-col gap-1 w-full pb-1.5 border-b border-slate-700/50">
            <button
              onClick={handleUndo}
              title="Undo"
              disabled={history.length <= 1}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${history.length > 1 ? "bg-slate-800 hover:bg-slate-700 text-white" : "text-slate-600 cursor-not-allowed"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              title="Redo"
              disabled={redoStack.length === 0}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${redoStack.length > 0 ? "bg-slate-800 hover:bg-slate-700 text-white" : "text-slate-600 cursor-not-allowed"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </button>
            <button
              onClick={handleClear}
              title="Clear"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-slate-800 text-rose-400 hover:bg-rose-500/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-col gap-1 w-full">
            <button
              onClick={() => setIsDrawing(true)}
              title="Draw"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isDrawing ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m18 15-6-6-6 6" />
                <path d="m9 9 3-3 3 3" />
                <path d="M5.8 11.3 2 15.1 6.3 19.3 10.1 15.5Z" />
                <path d="M11 6a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
              </svg>
            </button>
            <button
              onClick={() => setIsDrawing(false)}
              title="Select"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${!isDrawing ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 9 1.4-1.4A5 5 0 1 1 13.4 17L12 18.4" />
                <path d="M8.6 15.4 5 19" />
              </svg>
            </button>
          </div>

          <div className="w-6 h-px bg-slate-700/50" />

          {/* Brush Types */}
          {isDrawing && (
            <div className="flex flex-col gap-1 w-full">
              {["pencil", "circle", "spray", "eraser"].map((type) => (
                <button
                  key={type}
                  onClick={() => setBrushType(type as any)}
                  title={type}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${brushType === type ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                >
                  {type === "pencil" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  )}
                  {type === "circle" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                  {type === "spray" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3h.01" />
                      <path d="M7 5h.01" />
                      <path d="M5 7h.01" />
                      <path d="M10 9h.01" />
                      <path d="M21 21h.01" />
                      <path d="M17 19h.01" />
                      <path d="M19 17h.01" />
                      <path d="M14 15h.01" />
                      <path d="M21 3h-6a4 4 0 0 0-4 4v2" />
                      <path d="M11 21v-4a4 4 0 0 1 4-4h6" />
                    </svg>
                  )}
                  {type === "eraser" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m2 22 1-1h3l9-9" />
                      <path d="M3 21v-8" />
                      <path d="M16 10 4.2 21.8" />
                      <path d="m14 6-9 9" />
                      <path d="M18 6 6 18" />
                      <path d="m20 2-5 5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="w-6 h-px bg-slate-700/50" />

          {/* Save to Gallery */}
          <button
            onClick={handleSave}
            title="Save to Gallery"
            disabled={saveToast === "saving"}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400"
          >
            {saveToast === "saved" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-400"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                <path d="M7 3v4a1 1 0 0 0 1 1h7" />
              </svg>
            )}
          </button>

          {/* Open Gallery */}
          <button
            onClick={() => setShowGallery(true)}
            title="Gallery"
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {artworks.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </button>

          <div className="w-6 h-px bg-slate-700/50" />

          {/* Import / Export Icons */}
          <div className="flex flex-col gap-1 w-full">
            <label
              className="cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Import Image"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImport}
                className="hidden"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </label>
            <button
              onClick={handleExport}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Export Image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>

          {/* Logo / Trademark */}
          <div className="pt-1 mt-0.5 border-t border-slate-700/50 w-full flex justify-center">
            <div
              className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center p-1 opacity-70 hover:opacity-100 transition-opacity"
              title="AuraSynQ"
            >
              <img
                src="/icon.png"
                alt="AuraSynQ"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: PROPERTIES --- */}
      <div
        className={`absolute top-20 right-4 flex flex-col gap-4 z-20 transition-all duration-300 ease-in-out ${showUI ? "translate-x-0 opacity-100" : "translate-x-20 opacity-0 pointer-events-none"}`}
      >
        <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-700 flex flex-col gap-4 w-60 text-slate-200">
          {/* Color Picker */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Color
              </label>
              <div className="text-[10px] font-mono text-slate-400 opacity-50">
                {brushColor}
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden bg-transparent shadow-inner"
              />
              <div className="flex-1 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">
                HEX
              </div>
            </div>
          </div>

          {/* Size Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Size
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {brushSize}px
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
            />
          </div>

          {/* Object Properties (Visible only when selecting) */}
          {!isDrawing && selectedObject && (
            <>
              <div className="h-[1px] bg-slate-800" />
              <div>
                <label className="text-[10px] font-bold uppercase mb-2 block tracking-wider text-slate-500">
                  Selection
                </label>
                <button
                  onClick={toggleLock}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${isLocked ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                >
                  {isLocked ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>{" "}
                      Unlock Object
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>{" "}
                      Lock Object
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save Toast */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs font-semibold flex items-center gap-2 shadow-xl transition-all duration-300 ${saveToast === "saved" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-400"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span className="text-white">Saved to gallery</span>
      </div>

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={showGallery}
        artworks={artworks}
        currentArtworkId={currentArtworkId}
        onClose={() => setShowGallery(false)}
        onResume={handleResume}
        onDelete={deleteArtwork}
        onNewArtwork={handleNewArtwork}
      />
    </main>
  );
}
