import locale from "../locales/fa.json";

export type LocaleDictionary = Record<string, unknown>;

export const defaultLocale = locale as LocaleDictionary;

export function resolveTranslation(
  key: string,
  dictionary: LocaleDictionary = defaultLocale
): string {
  const resolved = key
    .split(".")
    .reduce<unknown>((accumulator, part) => {
      if (accumulator && typeof accumulator === "object" && part in (accumulator as Record<string, unknown>)) {
        return (accumulator as Record<string, unknown>)[part];
      }

      return undefined;
    }, dictionary);

  return typeof resolved === "string" ? resolved : key;
}

export function createTranslator(dictionary: LocaleDictionary = defaultLocale) {
  return (key: string) => resolveTranslation(key, dictionary);
}
