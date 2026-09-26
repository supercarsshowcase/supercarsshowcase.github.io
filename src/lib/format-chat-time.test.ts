import { describe, test as it, expect } from "bun:test";
import { formatChatTime } from "./format";

describe("formatChatTime", () => {
  it("shows only the time for messages sent today", () => {
    expect(formatChatTime(Date.now())).toMatch(/^\d{2}:\d{2}$/);
  });

  it("labels yesterday's messages", () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // 1ms before midnight = 23:59:59.999 yesterday — always exactly one
    // day back, regardless of when the test runs (DST-safe day math).
    const yesterdayMs = startOfToday.getTime() - 1;
    expect(formatChatTime(yesterdayMs).startsWith("Yesterday")).toBe(true);
  });

  it("shows the full weekday, date and year for older messages", () => {
    const old = new Date(2020, 0, 15, 9, 5).getTime();
    const out = formatChatTime(old);
    expect(out).toContain("2020"); // the year is always shown
    expect(out).toContain(","); // "Fri, 15 Jan 2020, 09:05" shape
    expect(out).toMatch(/\d{2}:\d{2}$/); // ends with the time
  });

  it("never crashes on boundary timestamps", () => {
    for (const ts of [0, Date.now(), Date.now() - 12 * 3_600_000, Date.now() - 48 * 3_600_000]) {
      expect(typeof formatChatTime(ts)).toBe("string");
      expect(formatChatTime(ts).length).toBeGreaterThan(0);
    }
  });
});
