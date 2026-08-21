import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

const SCANNER_ID = 'barcode-scanner-viewport';

export default function BarcodeScanner({ onScan, active = true }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);
  const lastScanRef = useRef({ code: '', at: 0 });

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const instance = new Html5Qrcode(SCANNER_ID, { verbose: false });
    scannerRef.current = instance;

    function safeStopAndClear() {
      // html5-qrcode's stop() throws *synchronously* (not a rejected promise)
      // when the scanner isn't actually running yet, which happens whenever
      // cleanup fires before the async start() has finished (e.g. React
      // StrictMode's double-invoke of effects in development).
      try {
        if (instance.isScanning) {
          instance.stop().catch(() => {}).finally(() => {
            try { instance.clear(); } catch { /* element already gone */ }
          });
        } else {
          try { instance.clear(); } catch { /* nothing to clear */ }
        }
      } catch {
        // scanner was never running - nothing to stop
      }
    }

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cancelled) return Promise.resolve();
        const cameraId = cameras.find((c) => /back|rear|environment/i.test(c.label))?.id || cameras[0]?.id;
        if (!cameraId) {
          setError('No camera found on this device.');
          setStarting(false);
          return Promise.resolve();
        }
        return instance
          .start(
            cameraId,
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decodedText) => {
              const now = Date.now();
              if (decodedText === lastScanRef.current.code && now - lastScanRef.current.at < 2500) {
                return; // debounce duplicate scans of the same code
              }
              lastScanRef.current = { code: decodedText, at: now };
              onScan(decodedText);
            },
            () => {} // per-frame decode failures are expected while aiming; ignore
          )
          .then(() => {
            if (cancelled) {
              // component unmounted while the camera was still starting up
              safeStopAndClear();
              return;
            }
            setStarting(false);
          });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Unable to access the camera. Please allow camera permission.');
          setStarting(false);
        }
      });

    return () => {
      cancelled = true;
      safeStopAndClear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <div id={SCANNER_ID} className="aspect-square w-full [&_video]:!object-cover" />
      {starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
          <Camera size={28} className="animate-pulse" />
          <p className="text-sm">Starting camera...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center text-white">
          <CameraOff size={28} />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {!starting && !error && (
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
      )}
    </div>
  );
}
