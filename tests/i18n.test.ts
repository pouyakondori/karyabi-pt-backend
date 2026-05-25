import { describe, expect, it } from "vitest";

import locale from "../src/locales/fa.json";
import { createTranslator } from "../src/lib/i18n";

describe("translation middleware utilities", () => {
  it("returns localized value for known keys", () => {
    const translate = createTranslator(locale);

    expect(translate("errors.gdprRequired")).toBe(locale.errors.gdprRequired);
  });

  it("falls back to the key for unknown values", () => {
    const translate = createTranslator(locale);

    expect(translate("unknown.key")).toBe("unknown.key");
  });
});
