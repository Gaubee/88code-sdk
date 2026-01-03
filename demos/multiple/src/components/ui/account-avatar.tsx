import * as React from 'react'

import { cn } from '@/lib/utils'

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function hslFromHash(hash: number): { h: number; s: number; l: number } {
  const h = hash % 360
  const s = 70
  const l = 52
  return { h, s, l }
}

function getBits(hash: number, count: number): Array<0 | 1> {
  const bits: Array<0 | 1> = []
  let value = hash
  for (let i = 0; i < count; i += 1) {
    bits.push((value & 1) as 0 | 1)
    value = value >>> 1
    if (value === 0) {
      value = fnv1a32(String(hash) + ':' + String(i))
    }
  }
  return bits
}

export function AccountAvatar({
  seed,
  name,
  className,
}: {
  seed: string
  name: string
  className?: string
}) {
  const hash = React.useMemo(() => fnv1a32(seed), [seed])
  const { h, s, l } = React.useMemo(() => hslFromHash(hash), [hash])
  const bits = React.useMemo(() => getBits(hash, 15), [hash])
  const fill = `hsl(${h} ${s}% ${l}%)`

  const cells: Array<{ x: number; y: number }> = []
  // 5x5 identicon, mirror horizontally: 3 cols define 5 cols
  // Use 5 rows * 3 cols = 15 bits
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const idx = y * 3 + x
      if (bits[idx] === 1) {
        cells.push({ x, y })
        if (x !== 2) {
          cells.push({ x: 4 - x, y })
        }
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={name}
      viewBox="0 0 5 5"
      className={cn('shrink-0', className)}
    >
      <title>{name}</title>
      {cells.map((cell, i) => (
        <rect
          key={`${cell.x}-${cell.y}-${i}`}
          x={cell.x}
          y={cell.y}
          width={1}
          height={1}
          rx={0.15}
          fill={fill}
        />
      ))}
    </svg>
  )
}
