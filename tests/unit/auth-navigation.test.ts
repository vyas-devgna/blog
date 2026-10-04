import { describe, expect, it } from "vitest";
import {
  safeReturnTo,
  googleErrorMessage,
} from "../../src/lib/auth-navigation";

describe("authentication navigation", () => {
  it("keeps local destinations including search and fragments", () => {
    expect(safeReturnTo("/discussions/?page=2#reply")).toBe(
      "/discussions/?page=2#reply",
    );
  });
  it("rejects external, scheme-relative, backslash and control-character destinations", () => {
    for (const value of [
      null,
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\n/evil.example",
      "/\t/evil.example",
      "/\u0000/evil.example",
      "javascript:alert(1)",
    ])
      expect(safeReturnTo(value)).toBe("/settings/");
  });
  it("never reflects provider errors as user-facing HTML or technical details", () => {
    expect(googleErrorMessage("access_denied")).toContain("cancel");
    expect(googleErrorMessage("<script>token</script>")).not.toContain(
      "script",
    );
    expect(googleErrorMessage(null)).toBe("");
  });
});
