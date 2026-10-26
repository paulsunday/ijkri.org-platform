import { describe, expect, it } from "vitest";

import {
  assertHoneypotEmpty,
  HONEYPOT_FIELD_NAME,
  isHoneypotFilled,
} from "./honeypot";

function makeFormData(honeypotValue?: string) {
  const formData = new FormData();

  if (honeypotValue !== undefined) {
    formData.set(HONEYPOT_FIELD_NAME, honeypotValue);
  }

  return formData;
}

describe("isHoneypotFilled", () => {
  it("returns false when the field is absent", () => {
    expect(isHoneypotFilled(makeFormData(), {})).toBe(false);
  });

  it("returns false when the field is empty", () => {
    expect(isHoneypotFilled(makeFormData(""), {})).toBe(false);
  });

  it("returns false when the field is only whitespace", () => {
    expect(isHoneypotFilled(makeFormData("   "), {})).toBe(false);
  });

  it("returns true when the field has a value", () => {
    expect(isHoneypotFilled(makeFormData("http://spam.example"), {})).toBe(
      true,
    );
  });
});

describe("assertHoneypotEmpty", () => {
  it("does not throw when the field is empty", () => {
    expect(() => assertHoneypotEmpty(makeFormData(), {})).not.toThrow();
  });

  it("throws a generic error when the field is filled", () => {
    expect(() =>
      assertHoneypotEmpty(makeFormData("spam"), {}),
    ).toThrow(/could not be processed/i);
  });
});
