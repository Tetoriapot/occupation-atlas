"use client";

import { useSyncExternalStore } from "react";

const themeEvent = "tansakusha-theme-change";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(themeEvent, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(themeEvent, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("tansakusha-theme", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event(themeEvent));
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? "ライトモードに切り替える" : "ダークモードに切り替える"}
      title={dark ? "ライトモード" : "ダークモード"}
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      <span className="theme-label">{dark ? "明るく" : "暗く"}</span>
    </button>
  );
}
