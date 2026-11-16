import { useCallback, useState } from "react";
import { useAuth } from "./useAuth";

const MAX_RECENT_SEARCHES = 8;

const readList = (key) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(list) ? list.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
};

const writeList = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage unavailable — history simply won't be kept.
  }
};

/**
 * Remembers what a staff member typed into a search box, newest first.
 * History is kept per logged-in user (so a shared branch PC doesn't show one
 * teller's searches to another) and per search box (`scope`).
 */
export const useRecentSearches = (scope) => {
  const { user } = useAuth();
  const key = `recentSearches:${user?.id ?? "anon"}:${scope}`;
  const [items, setItems] = useState(() => readList(key));
  const [loadedKey, setLoadedKey] = useState(key);

  // Re-read when the user or scope changes (e.g. user finished loading).
  if (loadedKey !== key) {
    setLoadedKey(key);
    setItems(readList(key));
  }

  const update = useCallback((fn) => {
    setItems((prev) => {
      const next = fn(prev);
      writeList(key, next);
      return next;
    });
  }, [key]);

  const addSearch = useCallback((term) => {
    const clean = (term ?? "").trim();
    if (clean.length < 2) return;
    update((prev) => [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_SEARCHES));
  }, [update]);

  const removeSearch = useCallback((term) => {
    update((prev) => prev.filter((t) => t !== term));
  }, [update]);

  const clearSearches = useCallback(() => update(() => []), [update]);

  return { recentSearches: items, addSearch, removeSearch, clearSearches };
};
