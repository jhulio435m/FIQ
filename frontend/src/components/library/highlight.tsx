import { highlightSegments } from "@/lib/highlight"

interface Props {
  text: string
  terms: string[]
}

export function Highlight({ text, terms }: Props) {
  return (
    <>
      {highlightSegments(text, terms).map((segment, i) =>
        segment.match ? (
          <mark key={i} className="rounded-sm bg-amber-100 px-0.5 text-inherit dark:bg-amber-500/25">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
  )
}
