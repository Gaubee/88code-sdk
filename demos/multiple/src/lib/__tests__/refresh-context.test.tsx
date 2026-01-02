// @vitest-environment jsdom

import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import {
  RefreshProvider,
  useRefresh,
  useRegisterRefetch,
} from '../refresh-context'

function ExposeApi({ apiRef }: { apiRef: { current: ReturnType<typeof useRefresh> | null } }) {
  const api = useRefresh()
  React.useEffect(() => {
    apiRef.current = api
  }, [api, apiRef])
  return null
}

function Subscriber({
  id,
  fn,
}: {
  id: string
  fn: () => unknown
}) {
  useRegisterRefetch(id, fn, true)
  return null
}

describe('RefreshProvider', () => {
  it('registers subscribers and refreshAll triggers them', () => {
    const apiRef: { current: ReturnType<typeof useRefresh> | null } = {
      current: null,
    }
    const a = vi.fn()
    const b = vi.fn()

    render(
      <RefreshProvider>
        <ExposeApi apiRef={apiRef} />
        <Subscriber id="a" fn={a} />
        <Subscriber id="b" fn={b} />
      </RefreshProvider>,
    )

    expect(apiRef.current?.subscriberCount).toBe(2)

    act(() => {
      apiRef.current?.refreshAll()
    })

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('keeps a key registered until all refs are gone', () => {
    const apiRef: { current: ReturnType<typeof useRefresh> | null } = {
      current: null,
    }
    const fn = vi.fn()

    const { rerender } = render(
      <RefreshProvider>
        <ExposeApi apiRef={apiRef} />
        <Subscriber id="same" fn={fn} />
        <Subscriber id="same" fn={fn} />
      </RefreshProvider>,
    )

    expect(apiRef.current?.subscriberCount).toBe(1)

    act(() => {
      apiRef.current?.refreshAll()
    })
    expect(fn).toHaveBeenCalledTimes(1)

    rerender(
      <RefreshProvider>
        <ExposeApi apiRef={apiRef} />
        <Subscriber id="same" fn={fn} />
      </RefreshProvider>,
    )

    act(() => {
      apiRef.current?.refreshAll()
    })
    expect(fn).toHaveBeenCalledTimes(2)

    rerender(
      <RefreshProvider>
        <ExposeApi apiRef={apiRef} />
      </RefreshProvider>,
    )

    expect(apiRef.current?.subscriberCount).toBe(0)
  })
})
