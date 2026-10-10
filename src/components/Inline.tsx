import React from 'react'

/** Renders one paragraph as React nodes. The only inline mark is *emphasis*. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g)
  return <>{parts.map((p, i) => p.startsWith('*') && p.endsWith('*') && p.length > 2
    ? <em key={i}>{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>)}</>
}
