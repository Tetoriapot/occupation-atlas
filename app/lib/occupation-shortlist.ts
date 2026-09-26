"use client";

import { useSyncExternalStore } from "react";
import {
  COMPARISON_LIMIT,
  normalizeComparedOccupationSlugs,
} from "./occupation-comparison";

const SHORTLIST_STORAGE_KEY = "tansakusha-occupation-shortlist-v1";
const COMPARISON_STORAGE_KEY = "tansakusha-occupation-comparison-v1";
const EMPTY_SLUGS: readonly string[] = Object.freeze([]);
const occupationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseStoredSlugs(
  raw: string | null,
  normalize: (slugs: Iterable<string>) => readonly string[] = normalizeSavedSlugs,
): readonly string[] {
  if (!raw) return EMPTY_SLUGS;

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY_SLUGS;
    return normalize(value.filter((item): item is string => typeof item === "string"));
  } catch {
    return EMPTY_SLUGS;
  }
}

function normalizeSavedSlugs(slugs: Iterable<string>): readonly string[] {
  return Object.freeze([
    ...new Set(
      [...slugs].filter((slug) => occupationSlugPattern.test(slug)),
    ),
  ]);
}

function createPersistedSlugStore(
  storageKey: string,
  normalize: (slugs: Iterable<string>) => readonly string[],
) {
  const listeners = new Set<() => void>();
  let cachedSlugs: readonly string[] | null = null;
  let storageListenerAttached = false;

  function readSnapshot(): readonly string[] {
    if (typeof window === "undefined") return EMPTY_SLUGS;
    if (cachedSlugs === null) {
      try {
        cachedSlugs = parseStoredSlugs(
          window.localStorage.getItem(storageKey),
          normalize,
        );
      } catch {
        cachedSlugs = EMPTY_SLUGS;
      }
    }
    return cachedSlugs;
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== storageKey) return;
    cachedSlugs = parseStoredSlugs(event.newValue, normalize);
    notify();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    if (!storageListenerAttached && typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
      storageListenerAttached = true;
    }

    return () => {
      listeners.delete(listener);
      if (
        listeners.size === 0 &&
        storageListenerAttached &&
        typeof window !== "undefined"
      ) {
        window.removeEventListener("storage", handleStorage);
        storageListenerAttached = false;
      }
    };
  }

  function writeSnapshot(slugs: Iterable<string>) {
    if (typeof window === "undefined") return;
    cachedSlugs = normalize(slugs);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cachedSlugs));
    } catch {
      // Storage can be unavailable in private browsing or under strict privacy settings.
      // Keep the in-memory selection usable for the current page session.
    }
    notify();
  }

  return { readSnapshot, subscribe, writeSnapshot };
}

const shortlistStore = createPersistedSlugStore(
  SHORTLIST_STORAGE_KEY,
  normalizeSavedSlugs,
);
const comparisonStore = createPersistedSlugStore(
  COMPARISON_STORAGE_KEY,
  normalizeComparedOccupationSlugs,
);

export function useSavedOccupationSlugs(): readonly string[] {
  return useSyncExternalStore(
    shortlistStore.subscribe,
    shortlistStore.readSnapshot,
    () => EMPTY_SLUGS,
  );
}

export function toggleSavedOccupation(slug: string) {
  const current = [...shortlistStore.readSnapshot()];
  shortlistStore.writeSnapshot(
    current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug],
  );
}

export function removeSavedOccupation(slug: string) {
  shortlistStore.writeSnapshot(
    shortlistStore.readSnapshot().filter((item) => item !== slug),
  );
}

export function clearSavedOccupations() {
  shortlistStore.writeSnapshot(EMPTY_SLUGS);
}

export { COMPARISON_LIMIT };

export function useComparedOccupationSlugs(): readonly string[] {
  return useSyncExternalStore(
    comparisonStore.subscribe,
    comparisonStore.readSnapshot,
    () => EMPTY_SLUGS,
  );
}

export function addComparedOccupation(slug: string) {
  const current = comparisonStore.readSnapshot();
  if (current.includes(slug) || current.length >= COMPARISON_LIMIT) return;
  comparisonStore.writeSnapshot([...current, slug]);
}

export function toggleComparedOccupation(slug: string) {
  const current = comparisonStore.readSnapshot();
  if (current.includes(slug)) {
    comparisonStore.writeSnapshot(current.filter((item) => item !== slug));
    return;
  }
  addComparedOccupation(slug);
}

export function removeComparedOccupation(slug: string) {
  comparisonStore.writeSnapshot(
    comparisonStore.readSnapshot().filter((item) => item !== slug),
  );
}

export function clearComparedOccupations() {
  comparisonStore.writeSnapshot(EMPTY_SLUGS);
}

export function replaceComparedOccupations(slugs: Iterable<string>) {
  comparisonStore.writeSnapshot(slugs);
}
