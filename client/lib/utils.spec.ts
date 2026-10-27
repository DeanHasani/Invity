import { describe, it, expect } from "vitest";
import { cn, csvEscape } from "./utils";

describe("csvEscape", () => {
  it("neutralizes formula prefixes", () => {
    expect(csvEscape("=1+1")).toBe("'=1+1");
    expect(csvEscape("+1")).toBe("'+1");
    expect(csvEscape("-1")).toBe("'-1");
    expect(csvEscape("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("quotes commas, quotes, CR and LF", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("a\rb")).toBe('"a\rb"');
    expect(csvEscape("a\nb")).toBe('"a\nb"');
  });

  it("leaves plain text alone", () => {
    expect(csvEscape("Sarah")).toBe("Sarah");
    expect(csvEscape("")).toBe("");
  });
});

describe("cn function", () => {
  it("should merge classes correctly", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    expect(cn("base-class", isActive && "active-class")).toBe(
      "base-class active-class",
    );
  });

  it("should handle false and null conditions", () => {
    const isActive = false;
    expect(cn("base-class", isActive && "active-class", null)).toBe(
      "base-class",
    );
  });

  it("should merge tailwind classes properly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should work with object notation", () => {
    expect(cn("base", { conditional: true, "not-included": false })).toBe(
      "base conditional",
    );
  });
});
