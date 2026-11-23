import test from "node:test";
import assert from "node:assert/strict";
import { isOpenNow } from "../src/hours.js";

// Philippine time is UTC+8. Monday, November 23, 2026 is a Monday.
const manila = (h, m = 0, dayOffset = 0) => new Date(Date.UTC(2026, 10, 23 + dayOffset, h - 8, m));
const hours = { mon: { open: "08:00", close: "21:00" }, tue: null };

test("open during the day and closed outside it", () => {
  assert.equal(isOpenNow(hours, manila(10)), true);
  assert.equal(isOpenNow(hours, manila(7, 59)), false);
  assert.equal(isOpenNow(hours, manila(21)), false); // the closing minute itself is closed
  assert.equal(isOpenNow(hours, manila(10, 0, 1)), false); // Tuesday has no hours
});

test("a cafe that closes after midnight stays open into the next morning", () => {
  const late = { mon: { open: "14:00", close: "02:00" } };
  assert.equal(isOpenNow(late, manila(23)), true);
  assert.equal(isOpenNow(late, manila(1, 0, 1)), true); // Tuesday 01:00, still Monday's opening
  assert.equal(isOpenNow(late, manila(3, 0, 1)), false);
  assert.equal(isOpenNow(late, manila(13)), false);
});

test("returns null when no hours were declared", () => {
  assert.equal(isOpenNow(undefined), null);
  assert.equal(isOpenNow({ mon: null, tue: null }), null);
});
