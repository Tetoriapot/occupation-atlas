"use client";

import { useState } from "react";

type DetailActionsProps = {
  occupationName: string;
  shareUrl: string;
  shareText: string;
  summaryText: string;
  characterText: string;
};

async function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.inset = "0 auto auto -9999px";
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  textArea.remove();
  activeElement?.focus();

  if (!copied) {
    throw new Error("copy failed");
  }
}

export function DetailActions({
  occupationName,
  shareUrl,
  shareText,
  summaryText,
  characterText,
}: DetailActionsProps) {
  const [status, setStatus] = useState({ message: "", sequence: 0 });

  function announce(message: string) {
    setStatus((current) => ({ message, sequence: current.sequence + 1 }));
  }

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${occupationName}｜探索者職業図鑑`,
          text: shareText,
          url: shareUrl,
        });
        announce("共有メニューを開きました。");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        announce("共有できませんでした。リンクのコピーをお試しください。");
      }
      return;
    }

    try {
      await copyToClipboard(shareUrl);
      announce("このページのURLをコピーしました。");
    } catch {
      announce("URLをコピーできませんでした。ブラウザーのアドレス欄からコピーしてください。");
    }
  }

  async function handleCopy(text: string, successMessage: string) {
    try {
      await copyToClipboard(text);
      announce(successMessage);
    } catch {
      announce("コピーできませんでした。ブラウザーの設定をご確認ください。");
    }
  }

  return (
    <div className="detail-actions" role="group" aria-label="共有とコピー">
      <div className="detail-actions__buttons">
        <button className="detail-action detail-action--primary" type="button" onClick={handleShare}>
          <span aria-hidden="true">↗</span>
          この職業を共有
        </button>
        <button
          className="detail-action"
          type="button"
          onClick={() => handleCopy(shareUrl, "このページのURLをコピーしました。")}
        >
          <span aria-hidden="true">🔗</span>
          URLをコピー
        </button>
        <button
          className="detail-action"
          type="button"
          onClick={() => handleCopy(summaryText, "30秒要約をコピーしました。")}
        >
          <span aria-hidden="true">▤</span>
          30秒要約をコピー
        </button>
        <button
          className="detail-action"
          type="button"
          onClick={() => handleCopy(characterText, "キャラクター案をコピーしました。")}
        >
          <span aria-hidden="true">＋</span>
          キャラ案をコピー
        </button>
      </div>
      <p className="detail-actions__status" role="status" aria-live="polite" aria-atomic="true">
        <span key={status.sequence}>{status.message}</span>
      </p>
    </div>
  );
}
