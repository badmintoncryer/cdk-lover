'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Built in the browser because behind CloudFront the server only sees the Lambda URL host. */
export function JoinQr({ path, size = 180, showUrl = true }: { path: string; size?: number; showUrl?: boolean }) {
  const [qr, setQr] = useState({ svg: '', url: '' });
  useEffect(() => {
    const url = `${window.location.origin}${path}`;
    void QRCode.toString(url, { type: 'svg', margin: 1, width: size }).then((svg) => setQr({ svg, url }));
  }, [path, size]);
  const { svg, url } = qr;
  return (
    <div className="flex flex-col items-center gap-1">
      {/* qrcode emits a self-contained SVG with no scripts. */}
      <div
        className="rounded-lg bg-white p-1.5"
        style={{ width: size + 12, height: size + 12 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showUrl && (
        <span className="max-w-[240px] break-all text-center text-xs text-slate-300">
          {url.replace(/^https?:\/\//, '')}
        </span>
      )}
    </div>
  );
}
