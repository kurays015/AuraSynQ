import { useState, useEffect, useCallback } from "react";

export interface SavedArtwork {
  id: string;
  title: string;
  thumbnail: string; // base64 PNG (low-res snapshot)
  canvasJSON: string; // fabric.Canvas.toJSON() stringified
  savedAt: number; // Date.now() – first save
  updatedAt: number; // Date.now() – last save
}

const STORAGE_KEY = "aurasynq_gallery";

function loadFromStorage(): SavedArtwork[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedArtwork[]) : [];
  } catch {
    return [];
  }
}

function persistToStorage(artworks: SavedArtwork[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artworks));
  } catch (err) {
    console.warn("[AuraSynQ] Failed to save gallery to localStorage:", err);
  }
}

export function useArtworkStorage() {
  const [artworks, setArtworks] = useState<SavedArtwork[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setArtworks(loadFromStorage());
  }, []);

  /**
   * Save or update an artwork.
   * - Pass `existingId` to overwrite a saved artwork (update thumbnail + JSON).
   * - Pass `null` to create a new entry.
   * Returns the id of the saved artwork.
   */
  const saveArtwork = useCallback(
    (
      existingId: string | null,
      canvasJSON: string,
      thumbnail: string,
      titleOverride?: string,
    ): string => {
      let id = existingId;
      let updatedList: SavedArtwork[];

      setArtworks((prev) => {
        const now = Date.now();

        if (id) {
          // Update existing artwork
          updatedList = prev.map((a) =>
            a.id === id ? { ...a, canvasJSON, thumbnail, updatedAt: now } : a,
          );
          // If the id was not found (stale ref), fall back to creating new
          if (!updatedList.find((a) => a.id === id)) {
            id = null;
          }
        }

        if (!id) {
          // Create new artwork
          id = crypto.randomUUID();
          const title = titleOverride ?? `Artwork #${prev.length + 1}`;
          const newArtwork: SavedArtwork = {
            id,
            title,
            thumbnail,
            canvasJSON,
            savedAt: now,
            updatedAt: now,
          };
          updatedList = [newArtwork, ...prev];
        }

        persistToStorage(updatedList!);
        return updatedList!;
      });

      return id!;
    },
    [],
  );

  /**
   * Delete an artwork by id.
   */
  const deleteArtwork = useCallback((id: string) => {
    setArtworks((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      persistToStorage(updated);
      return updated;
    });
  }, []);

  /**
   * Update only the title of an existing artwork.
   */
  const renameArtwork = useCallback((id: string, title: string) => {
    setArtworks((prev) => {
      const updated = prev.map((a) =>
        a.id === id ? { ...a, title, updatedAt: Date.now() } : a,
      );
      persistToStorage(updated);
      return updated;
    });
  }, []);

  return { artworks, saveArtwork, deleteArtwork, renameArtwork };
}
