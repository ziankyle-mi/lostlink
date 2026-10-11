import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  isAllowedMimeType,
  parseBase64DataUrl,
} from "~/lib/storage";

describe("Storage configuration & validators", () => {
  it("allows standard image mime types", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
    expect(isAllowedMimeType("image/jpg")).toBe(true);
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("image/webp")).toBe(true);
  });

  it("rejects unauthorized mime types", () => {
    expect(isAllowedMimeType("image/gif")).toBe(false);
    expect(isAllowedMimeType("application/pdf")).toBe(false);
    expect(isAllowedMimeType("text/plain")).toBe(false);
    expect(isAllowedMimeType("application/octet-stream")).toBe(false);
  });

  it("enforces 5 MB limit constant", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("parses valid base64 data URLs accurately", () => {
    // 4-byte base64 string
    const sample = "data:image/png;base64,AAAA";
    const parsed = parseBase64DataUrl(sample);
    expect(parsed).not.toBeNull();
    expect(parsed?.mimeType).toBe("image/png");
    expect(parsed?.data.length).toBe(3);
  });

  it("returns null on malformed base64 strings", () => {
    expect(parseBase64DataUrl("not-a-data-url")).toBeNull();
    expect(parseBase64DataUrl("data:image/png;base64,")).toBeNull();
  });
});
