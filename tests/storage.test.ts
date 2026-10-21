import { describe, expect, it } from "vitest";
import {
  MAX_DATA_URL_LENGTH,
  MAX_FILE_SIZE_BYTES,
  isAllowedMimeType,
  parseBase64DataUrl,
  stripImageMetadata,
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

  it("rejects oversized payloads before decoding them", () => {
    const oversized = `data:image/png;base64,${"A".repeat(MAX_DATA_URL_LENGTH)}`;
    expect(parseBase64DataUrl(oversized)).toBeNull();
  });

  it("strips EXIF / GPS metadata from JPEG without breaking image structure", () => {
    // SOI (FF D8) + APP1 (FF E1, len=10, 'Exif\0\0GPS!') + DQT (FF DB, len=5, data) + SOS (FF DA) + EOI (FF D9)
    const exifPayload = new TextEncoder().encode("Exif\0\0GPS!");
    const app1Len = 2 + exifPayload.length;
    const jpegWithExif = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe1, // APP1 marker (EXIF)
      (app1Len >> 8) & 0xff, app1Len & 0xff, // Length
      ...exifPayload,
      0xff, 0xdb, // DQT marker
      0x00, 0x05, 0x01, 0x02, 0x03, // DQT data
      0xff, 0xda, // SOS marker
      0x00, 0x03, 0x01, // SOS header length & parameter
      0x11, 0x22, 0x33, // Scan data
      0xff, 0xd9, // EOI
    ]);


    const cleaned = stripImageMetadata(jpegWithExif, "image/jpeg");
    expect(cleaned[0]).toBe(0xff);
    expect(cleaned[1]).toBe(0xd8);
    // APP1 marker (0xFF, 0xE1) must be stripped
    let hasApp1 = false;
    for (let i = 0; i < cleaned.length - 1; i++) {
      if (cleaned[i] === 0xff && cleaned[i + 1] === 0xe1) {
        hasApp1 = true;
        break;
      }
    }
    expect(hasApp1).toBe(false);
    expect(cleaned[cleaned.length - 2]).toBe(0xff);
    expect(cleaned[cleaned.length - 1]).toBe(0xd9);
  });

  it("strips eXIf and text chunks from PNG while preserving critical chunks", () => {
    // PNG signature
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = [0x00, 0x00, 0x00, 0x0d, ...new TextEncoder().encode("IHDR"), ...new Uint8Array(13), 0x00, 0x00, 0x00, 0x00];
    const exifChunk = [0x00, 0x00, 0x00, 0x08, ...new TextEncoder().encode("eXIf"), ...new TextEncoder().encode("GPS-DATA"), 0x00, 0x00, 0x00, 0x00];
    const textChunk = [0x00, 0x00, 0x00, 0x06, ...new TextEncoder().encode("tEXt"), ...new TextEncoder().encode("Author"), 0x00, 0x00, 0x00, 0x00];
    const iend = [0x00, 0x00, 0x00, 0x00, ...new TextEncoder().encode("IEND"), 0xae, 0x42, 0x60, 0x82];

    const rawPng = new Uint8Array([...sig, ...ihdr, ...exifChunk, ...textChunk, ...iend]);
    const cleaned = stripImageMetadata(rawPng, "image/png");

    const decoded = new TextDecoder("ascii").decode(cleaned);
    expect(decoded.includes("eXIf")).toBe(false);
    expect(decoded.includes("tEXt")).toBe(false);
    expect(decoded.includes("IHDR")).toBe(true);
    expect(decoded.includes("IEND")).toBe(true);
  });
});

