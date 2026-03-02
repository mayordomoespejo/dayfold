/**
 * Uppercases the first cased letter in a string using the provided locale.
 * Leaves scripts without letter casing unchanged.
 */
export function capitalizeSentenceStart(text: string, locale: string): string {
  const firstLetterIndex = text.search(/\p{L}/u)
  if (firstLetterIndex === -1) return text

  const firstLetter = text[firstLetterIndex]
  const uppercasedLetter = firstLetter.toLocaleUpperCase(locale)

  if (uppercasedLetter === firstLetter) return text

  return `${text.slice(0, firstLetterIndex)}${uppercasedLetter}${text.slice(firstLetterIndex + 1)}`
}
