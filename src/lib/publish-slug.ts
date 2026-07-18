export const PUBLISH_SLUG_LENGTH = 9;

const SLUG_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function isPublishSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === PUBLISH_SLUG_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

function secureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function generatePublishSlug(
  randomBytes: (length: number) => Uint8Array = secureRandomBytes,
): string {
  const bytes = randomBytes(PUBLISH_SLUG_LENGTH);
  if (bytes.length !== PUBLISH_SLUG_LENGTH) {
    throw new RangeError(
      `Slug generation requires ${PUBLISH_SLUG_LENGTH} random bytes.`,
    );
  }

  return Array.from(
    bytes,
    (byte) => SLUG_ALPHABET[byte & (SLUG_ALPHABET.length - 1)],
  ).join("");
}
