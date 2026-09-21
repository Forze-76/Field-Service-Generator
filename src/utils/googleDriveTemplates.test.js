import { describe, expect, it } from "vitest";
import { templateFolderForTrip } from "./googleDriveTemplates";

describe("Google Drive template routing", () => {
  it("routes the default report trip types to their private Drive folders", () => {
    expect(templateFolderForTrip("Service")).toBe("1IaDAXtAaia1W89sm4oYGgg-bcDZJ4H8N");
    expect(templateFolderForTrip("Warranty")).toBe("157HhuAvuCtUr-p8T6MzNprrj3Vue5HfW");
    expect(templateFolderForTrip("Start Up")).toBe("1od01azDdvld46oUZPIdu0JlimfxRWVEe");
    expect(templateFolderForTrip("Inspection")).toBe("1SDPhFlbVtzyr0GWigWB_gzyOMeDSkvMI");
  });

  it("normalizes capitalization and returns null for an unmapped custom type", () => {
    expect(templateFolderForTrip("  START UP ")).toBe("1od01azDdvld46oUZPIdu0JlimfxRWVEe");
    expect(templateFolderForTrip("Custom Visit")).toBeNull();
  });
});
