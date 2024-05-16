export const IS_MAC = navigator?.platform?.toUpperCase().includes('MAC')
  ?? navigator?.userAgentData?.platform?.toUpperCase().includes('MAC')
  ?? false;
