'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Built in the browser because behind CloudFront the server only sees the Lambda URL host. */
export function JoinQr({ path, size = 180 }: { path: string; size?: number }) {
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
        className="rounded bg-white p-1"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="text-xs text-slate-300 break-all max-w-[240px] text-center">{url}</span>
    </div>
  );
}
