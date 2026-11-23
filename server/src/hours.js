export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Philippine time is UTC+8 all year (no daylight saving), so a fixed offset is enough.
const manila = (date) => new Date(date.getTime() + 8 * 3600 * 1000);

/**
 * Is the cafe open at `date`? Returns null when the cafe has not declared any hours.
 * A closing time earlier than the opening time means the cafe closes after midnight.
 */
export function isOpenNow(openingHours, date = new Date()) {
  if (!openingHours) return null;
  const declared = DAYS.some((d) => openingHours[d]);
  if (!declared) return null;
  const t = manila(date);
  const dayIdx = (t.getUTCDay() + 6) % 7; // Monday = 0
  const minutes = t.getUTCHours() * 60 + t.getUTCMinutes();
  const today = openingHours[DAYS[dayIdx]];
  if (today) {
    const open = toMin(today.open), close = toMin(today.close);
    if (open < close && minutes >= open && minutes < close) return true;
    if (open >= close && minutes >= open) return true; // closes after midnight
  }
  const yesterday = openingHours[DAYS[(dayIdx + 6) % 7]];
  if (yesterday) {
    const open = toMin(yesterday.open), close = toMin(yesterday.close);
    if (open >= close && minutes < close) return true; // spill-over from yesterday's late closing
  }
  return false;
}
