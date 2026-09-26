import type { AptitudeKey, Occupation } from "@/app/types/occupation";

export const aptitudeLabels: Record<AptitudeKey, string> = {
  investigation: "調査",
  negotiation: "交渉",
  combat: "戦闘",
  infiltration: "潜入",
  support: "サポート",
  knowledge: "知識",
  beginnerFriendly: "初心者おすすめ",
};

export const aptitudeOrder: AptitudeKey[] = [
  "investigation",
  "negotiation",
  "combat",
  "infiltration",
  "support",
  "knowledge",
  "beginnerFriendly",
];

export function getTopAptitudes(
  aptitude: Occupation["aptitude"],
  limit = 3,
): Array<{ key: AptitudeKey; label: string; value: number }> {
  return aptitudeOrder
    .map((key) => ({ key, label: aptitudeLabels[key], value: aptitude[key] }))
    .sort(
      (a, b) =>
        b.value - a.value || aptitudeOrder.indexOf(a.key) - aptitudeOrder.indexOf(b.key),
    )
    .slice(0, limit);
}
