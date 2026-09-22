import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * True once the component has mounted on the client; false during SSR and
 * the first client render. Backs "render nothing until the client can
 * format this locale-dependent value" patterns (dates, etc.) without
 * tripping `react-hooks/set-state-in-effect` — a useState+useEffect pair
 * that calls setState synchronously in the effect body is exactly what that
 * rule flags. useSyncExternalStore's getSnapshot/getServerSnapshot split is
 * the React-blessed way to read "are we hydrated yet": React renders with
 * getServerSnapshot on the server and on the first client pass (so hydration
 * matches), then re-renders with getSnapshot once mounted — no manual effect
 * or state needed. `subscribe` never fires because this value only changes
 * once, at mount, which React already schedules for us.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
