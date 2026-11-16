/** Minúsculas y sin tildes, igual que la búsqueda del backend. */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export function searchTerms(query: string): string[] {
  return foldText(query)
    .split(/\s+/)
    .filter((term) => term.length > 0)
}

export interface TextSegment {
  text: string
  match: boolean
}

/**
 * Divide `text` en tramos que coinciden o no con algún término. Compara sobre el
 * texto plegado (sin tildes) pero devuelve los tramos del texto original.
 */
export function highlightSegments(text: string, terms: string[]): TextSegment[] {
  if (!text || terms.length === 0) return [{ text, match: false }]

  // Mapa carácter plegado → índice en el original (un carácter puede plegarse a varios).
  let folded = ""
  const origin: number[] = []
  Array.from(text).forEach((char, index) => {
    const f = foldText(char)
    folded += f
    for (let i = 0; i < f.length; i++) origin.push(index)
  })
  const chars = Array.from(text)

  const marked = new Array<boolean>(chars.length).fill(false)
  for (const term of terms) {
    let from = folded.indexOf(term)
    while (from !== -1) {
      for (let i = from; i < from + term.length; i++) marked[origin[i]] = true
      from = folded.indexOf(term, from + term.length)
    }
  }

  const segments: TextSegment[] = []
  chars.forEach((char, i) => {
    const last = segments[segments.length - 1]
    if (last && last.match === marked[i]) last.text += char
    else segments.push({ text: char, match: marked[i] })
  })
  return segments
}
