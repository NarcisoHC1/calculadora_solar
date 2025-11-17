export {};

declare global {
  interface Window {
    SYBridge?: {
      gtm: (event: string, data?: any) => void;
      navigate: (path: string, payload?: any) => void;
      getParentUtms: () => Record<string, any>;
    };
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: Record<string, any>;
        utm?: Record<string, any>;
      }) => void;
    };
  }
}
