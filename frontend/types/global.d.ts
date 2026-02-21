// Extend the Window interface to include google
declare global {
  interface Window {
    google: any;
  }
}

// This is necessary to make the declaration "global"
export {};