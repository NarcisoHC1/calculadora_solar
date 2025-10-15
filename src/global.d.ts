export {};

declare global {
  interface Window {
    SYBridge?: {
      gtm: (event: string, data?: any) => void;
      navigate: (path: string, payload?: any) => void;
      getParentUtms: () => Record<string, any>;
    };
  }
}
