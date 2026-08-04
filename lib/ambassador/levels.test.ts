import { describe, expect, it } from "vitest";

import { calculateAmbassadorLevel } from "./levels";

describe("calculateAmbassadorLevel", () => {
  it("returns NONE below the Bronze threshold", () => {
    expect(calculateAmbassadorLevel(0)).toBe("NONE");
    expect(calculateAmbassadorLevel(2)).toBe("NONE");
  });

  it("returns BRONZE at 3 and up to 7", () => {
    expect(calculateAmbassadorLevel(3)).toBe("BRONZE");
    expect(calculateAmbassadorLevel(7)).toBe("BRONZE");
  });

  it("returns SILVER at 8 and up to 14", () => {
    expect(calculateAmbassadorLevel(8)).toBe("SILVER");
    expect(calculateAmbassadorLevel(14)).toBe("SILVER");
  });

  it("returns GOLD at 15 and up to 29", () => {
    expect(calculateAmbassadorLevel(15)).toBe("GOLD");
    expect(calculateAmbassadorLevel(29)).toBe("GOLD");
  });

  it("returns PLATINUM at 30 and beyond", () => {
    expect(calculateAmbassadorLevel(30)).toBe("PLATINUM");
    expect(calculateAmbassadorLevel(1000)).toBe("PLATINUM");
  });
});
