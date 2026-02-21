"use client";

import React, { useState, useCallback } from "react";
import { SavedArtwork } from "@/hooks/useArtworkStorage";

interface GalleryModalProps {
  isOpen: boolean;
  artworks: SavedArtwork[];
  currentArtworkId: string | null;
  onClose: () => void;
  onResume: (artwork: SavedArtwork) => void;
  onDelete: (id: string) => void;
  onNewArtwork: () => void;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function GalleryModal({
  isOpen,
  artworks,
  currentArtworkId,
  onClose,
  onResume,
  onDelete,
  onNewArtwork,
}: GalleryModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (deletingId === id) {
        onDelete(id);
        setDeletingId(null);
      } else {
        setDeletingId(id);
        // Auto-cancel confirm after 3s
        setTimeout(
          () => setDeletingId((prev) => (prev === id ? null : prev)),
          3000,
        );
      }
    },
    [deletingId, onDelete],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
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
                className="text-indigo-400"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Gallery</h2>
              <p className="text-slate-500 text-[10px]">
                {artworks.length === 0
                  ? "No saved artworks"
                  : `${artworks.length} artwork${artworks.length !== 1 ? "s" : ""} saved`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Artwork */}
            <button
              onClick={onNewArtwork}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
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
              >
                <path d="M5 12h14M12 5v14" />
              </svg>
              New
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
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
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {artworks.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-600"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-400 font-medium text-sm">
                  No artworks yet
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  Save your canvas with the 💾 button to see it here
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {artworks.map((artwork) => {
                const isCurrent = artwork.id === currentArtworkId;
                const isConfirmingDelete = deletingId === artwork.id;

                return (
                  <div
                    key={artwork.id}
                    className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 ${
                      isCurrent
                        ? "border-indigo-500/60 shadow-lg shadow-indigo-500/10"
                        : "border-slate-800 hover:border-slate-600"
                    } bg-slate-900`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full aspect-video bg-slate-800 overflow-hidden">
                      {artwork.thumbnail ? (
                        <img
                          src={artwork.thumbnail}
                          alt={artwork.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </div>
                      )}

                      {/* Active badge */}
                      {isCurrent && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider">
                          Editing
                        </div>
                      )}
                    </div>

                    {/* Info + Actions */}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-semibold truncate">
                          {artwork.title}
                        </p>
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          {artwork.updatedAt !== artwork.savedAt
                            ? "Updated "
                            : "Saved "}
                          {timeAgo(artwork.updatedAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Delete button — always visible */}
                        <button
                          onClick={(e) => handleDeleteClick(e, artwork.id)}
                          title={
                            isConfirmingDelete
                              ? "Tap again to confirm"
                              : "Delete"
                          }
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isConfirmingDelete
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 scale-105"
                              : "bg-slate-800 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                          }`}
                        >
                          {isConfirmingDelete ? (
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
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
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
                            </svg>
                          )}
                        </button>

                        {/* Resume / Current */}
                        {isCurrent ? (
                          <button
                            onClick={onClose}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                          >
                            Current
                          </button>
                        ) : (
                          <button
                            onClick={() => onResume(artwork)}
                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors flex items-center gap-1"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
