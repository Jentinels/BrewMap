export const PRICE_LABEL = { low: "₱ Budget", mid: "₱₱ Mid-range", high: "₱₱₱ Premium" };
export const PLATFORM_LABEL = { grab: "Grab", foodpanda: "foodpanda" };
export const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];

export const distanceLabel = (km) => (km == null ? "" : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

// "08:00" -> "8:00 AM"
export function time12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Today's hours in Philippine time, or "Hours not declared".
export function todayHours(openingHours) {
  if (!openingHours) return "Hours not declared";
  const idx = (new Date(Date.now() + 8 * 3600000).getUTCDay() + 6) % 7;
  const declared = DAYS.some(([k]) => openingHours[k]);
  if (!declared) return "Hours not declared";
  const h = openingHours[DAYS[idx][0]];
  return h ? `${time12(h.open)} to ${time12(h.close)}` : "Closed today";
}

// The amenities a cafe has declared as true; empty when nothing is declared.
export function amenityLabels(a) {
  const out = [];
  if (a?.wifi) out.push("Wi-Fi");
  if (a?.outlets) out.push("Power outlets");
  if (a?.quietSpace) out.push("Quiet or study-friendly");
  return out;
}

export const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
