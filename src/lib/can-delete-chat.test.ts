import { describe, test as it, expect } from "bun:test";
import { canDeleteChatMessage } from "./format";

describe("canDeleteChatMessage", () => {
  it("lets the owner delete anyone's message, including their own", () => {
    expect(canDeleteChatMessage("owner", true)).toBe(true);
    expect(canDeleteChatMessage("owner", false)).toBe(true);
  });

  it("lets admins and moderators delete others' messages", () => {
    expect(canDeleteChatMessage("admin", false)).toBe(true);
    expect(canDeleteChatMessage("moderator", false)).toBe(true);
  });

  it("does not offer admins/moderators deletion of their own messages", () => {
    expect(canDeleteChatMessage("admin", true)).toBe(false);
    expect(canDeleteChatMessage("moderator", true)).toBe(false);
  });

  it("denies regular users and guests outright", () => {
    for (const role of [null, undefined, "user", "", "OWNER"]) {
      expect(canDeleteChatMessage(role, false)).toBe(false);
      expect(canDeleteChatMessage(role, true)).toBe(false);
    }
  });
});
