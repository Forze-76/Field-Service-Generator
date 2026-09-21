import { describe, expect, it } from "vitest";
import { calculateCompressedDimensions } from "./fsr";

describe("photo compression sizing", () => {
  it("reduces large iPad photos while preserving aspect ratio", () => {
    expect(calculateCompressedDimensions(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(calculateCompressedDimensions(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it("does not enlarge an image that is already below the limit", () => {
    expect(calculateCompressedDimensions(1200, 900)).toEqual({ width: 1200, height: 900 });
  });
});
