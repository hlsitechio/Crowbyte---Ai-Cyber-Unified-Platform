import React from 'react';
export { IS_ELECTRON } from './platform';
import { IS_ELECTRON } from './platform';

/** CSS class for content that needs to clear the Electron titlebar */
export const TITLEBAR_OFFSET = IS_ELECTRON ? 'pt-8' : '';

/** Hook: returns platform-specific values */
export function usePlatform() {
  return {
    isElectron: IS_ELECTRON,
    isWeb: !IS_ELECTRON,
    titlebarOffset: TITLEBAR_OFFSET,
  };
}

/** Wrapper: renders children only in Electron */
export function ElectronOnly({ children }: { children: React.ReactNode }) {
  return IS_ELECTRON ? React.createElement(React.Fragment, null, children) : null;
}

/** Wrapper: renders children only on Web */
export function WebOnly({ children }: { children: React.ReactNode }) {
  return !IS_ELECTRON ? React.createElement(React.Fragment, null, children) : null;
}
