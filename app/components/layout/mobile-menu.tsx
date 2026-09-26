"use client";

import { useRef, type ReactNode } from "react";

export function MobileMenu({ children }: { children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu(restoreFocus = false) {
    const details = detailsRef.current;
    if (!details?.open) return;
    details.open = false;
    if (restoreFocus) details.querySelector("summary")?.focus();
  }

  return (
    <details
      ref={detailsRef}
      className="mobile-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current?.open) {
          event.preventDefault();
          closeMenu(true);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          closeMenu();
        }
      }}
    >
      <summary role="button" aria-label="サイトメニュー">
        <span className="mobile-menu-icon" aria-hidden="true">☰</span>
        <span className="mobile-menu-label">メニュー</span>
      </summary>
      <nav
        aria-label="モバイルナビゲーション"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a") &&
            !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
          ) {
            closeMenu();
          }
        }}
      >
        {children}
      </nav>
    </details>
  );
}
