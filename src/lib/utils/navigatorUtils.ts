declare global {
  // extend with the userAgentData: NavigatorUAData property (currently experimental)
  // see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgentData
  interface Navigator {
    userAgentData?: {
      platform: string
    }
  }
}

export function isMacDevice() {
  return (
    typeof navigator !== 'undefined' &&
    (navigator?.platform?.toUpperCase().includes('MAC') ??
      navigator?.userAgentData?.platform?.toUpperCase().includes('MAC') ??
      false)
  )
}
