const TOKYO_TIME_ZONE = "Asia/Tokyo";
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const JAPANESE_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MILLISECONDS_PER_DAY = 86_400_000;

function parseDateKey(dateKey: string): [number, number, number] {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new RangeError(`日付はYYYY-MM-DD形式で指定してください: ${dateKey}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`実在する日付を指定してください: ${dateKey}`);
  }

  return [year, month, day];
}

function hashSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createRawPermutation(blockIndex: number, occupationCount: number): number[] {
  const permutation = Array.from({ length: occupationCount }, (_, index) => index);
  let state = hashSeed(`tansakusha-daily:${blockIndex}:${occupationCount}`) || 0x9e3779b9;

  const nextRandom = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };

  for (let index = occupationCount - 1; index > 0; index -= 1) {
    const swapIndex = nextRandom() % (index + 1);
    [permutation[index], permutation[swapIndex]] = [permutation[swapIndex], permutation[index]];
  }

  return permutation;
}

/** 指定時刻をAsia/Tokyoの暦日に変換する。 */
export function getTokyoDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new RangeError("有効な日時を指定してください");

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * 日付と掲載件数だけから「本日の一職」の位置を決める純関数。
 * 掲載件数日を1ブロックとして並びを毎回シャッフルするため、各ブロックで全件を1回ずつ巡回する。
 * ブロック境界は先頭を調整し、掲載件数が2件以上なら連続日に同じ位置を返さない。
 */
export function getDailyOccupationIndex(dateKey: string, occupationCount: number): number {
  const [year, month, day] = parseDateKey(dateKey);
  if (!Number.isSafeInteger(occupationCount) || occupationCount <= 0) {
    throw new RangeError("掲載件数は1以上の安全な整数で指定してください");
  }

  if (occupationCount === 1) return 0;

  const epochDay = Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY);
  const blockIndex = Math.floor(epochDay / occupationCount);
  const offset = ((epochDay % occupationCount) + occupationCount) % occupationCount;

  // 2件では非重複を保証する並びは交互のみ。向きだけをサイト固有のseedで固定する。
  if (occupationCount === 2) {
    const first = hashSeed("tansakusha-daily:pair") % 2;
    return offset === 0 ? first : 1 - first;
  }

  const permutation = createRawPermutation(blockIndex, occupationCount);
  const previousPermutation = createRawPermutation(blockIndex - 1, occupationCount);
  const previousLast = previousPermutation[occupationCount - 1];

  if (permutation[0] === previousLast) {
    [permutation[0], permutation[1]] = [permutation[1], permutation[0]];
  }

  return permutation[offset];
}

export function formatJapaneseDateLabel(dateKey: string): string {
  const [year, month, day] = parseDateKey(dateKey);
  const weekday = JAPANESE_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}
