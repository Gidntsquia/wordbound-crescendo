// The word list is a plain text file (one uppercase word per line, 3–7 letters),
// loaded by the caller so this module stays free of DOM and bundler imports.

export type Dictionary = ReadonlySet<string>;

export function parseDictionary(text: string): Dictionary {
  return new Set(text.split('\n').filter(Boolean));
}
