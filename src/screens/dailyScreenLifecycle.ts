export function setupMountedRef(mounted: { current: boolean }) {
  mounted.current = true
  return () => { mounted.current = false }
}
