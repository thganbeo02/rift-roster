import { describe, expect, it } from "vitest";

import {
  generatePublishSlug,
  isPublishSlug,
  PUBLISH_SLUG_LENGTH,
} from "@/lib/publish-slug";

describe("publish slug", () => {
  it("generates a fixed-length URL-safe slug from secure random bytes", () => {
    const slug = generatePublishSlug(
      () => Uint8Array.from([0, 1, 25, 26, 51, 52, 61, 62, 63]),
    );

    expect(slug).toBe("ABZaz09-_");
    expect(slug).toHaveLength(PUBLISH_SLUG_LENGTH);
    expect(isPublishSlug(slug)).toBe(true);
  });

  it.each([
    null,
    "short",
    "abcdefghij",
    "bad slug!",
    123456789,
  ])("rejects invalid slug %j", (value) => {
    expect(isPublishSlug(value)).toBe(false);
  });

  it("rejects a random byte source with the wrong length", () => {
    expect(() => generatePublishSlug(() => new Uint8Array(2))).toThrow(
      RangeError,
    );
  });
});
