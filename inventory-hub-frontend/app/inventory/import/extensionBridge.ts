// Talks to the optional "InventoryHub Order Capture" Chrome extension
// (see /curl-capture-extension). Returns the latest captured fetch(...) command
// for a platform.
//
// The extension ID is printed on chrome://extensions after you load it unpacked.
// Put it in .env.local as NEXT_PUBLIC_CAPTURE_EXTENSION_ID=<id>.

const EXTENSION_ID = process.env.NEXT_PUBLIC_CAPTURE_EXTENSION_ID ?? '';

export type Capture = { command: string; url: string; capturedAt: number };

// 'unavailable': the extension cannot be reached. 'empty': it has no capture yet.
export type CaptureResult =
  | { status: 'ok'; capture: Capture }
  | { status: 'empty' }
  | { status: 'unavailable' };

type ChromeRuntime = {
  sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void;
  lastError?: { message?: string };
};

function runtime(): ChromeRuntime | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
}

export function isExtensionAvailable(): boolean {
  return !!EXTENSION_ID && !!runtime()?.sendMessage;
}

export function getCapturedCommand(platform: 'pinduoduo' | 'taobao'): Promise<CaptureResult> {
  return new Promise((resolve) => {
    const rt = runtime();
    if (!EXTENSION_ID || !rt?.sendMessage) return resolve({ status: 'unavailable' });
    try {
      rt.sendMessage(EXTENSION_ID, { type: 'GET_CAPTURE', platform }, (resp) => {
        // Chrome sets lastError when the extension isn't installed. Reading it also
        // suppresses the "Unchecked runtime.lastError" console warning.
        if (rt.lastError) return resolve({ status: 'unavailable' });
        resolve(resp ? { status: 'ok', capture: resp as Capture } : { status: 'empty' });
      });
    } catch {
      resolve({ status: 'unavailable' });
    }
  });
}
