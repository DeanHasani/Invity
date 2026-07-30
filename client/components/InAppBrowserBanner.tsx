import { useState, useEffect } from "react";

export function detectInApp(): { inApp: boolean; appName: string } {
  const ua = navigator.userAgent || "";
  if (/LinkedIn/i.test(ua))                                                      return { inApp: true, appName: "LinkedIn" };
  if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua))                                  return { inApp: true, appName: "Facebook" };
  if (/Instagram/i.test(ua))                                                     return { inApp: true, appName: "Instagram" };
  if (/Twitter/i.test(ua))                                                       return { inApp: true, appName: "X (Twitter)" };
  if (/musical_ly|TikTok/i.test(ua))                                             return { inApp: true, appName: "TikTok" };
  if (/MicroMessenger/i.test(ua))                                                return { inApp: true, appName: "WeChat" };
  if (/wv/.test(ua) && /Android/i.test(ua))                                     return { inApp: true, appName: "an app" };
  if (/iPhone|iPad/.test(ua) && !/Safari/.test(ua) && /AppleWebKit/.test(ua))   return { inApp: true, appName: "an app" };
  return { inApp: false, appName: "" };
}

function openInChrome(url: string, isAndroid: boolean) {
  if (isAndroid) {
    window.location.href =
      `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  } else {
    // iOS Chrome URL scheme
    window.location.href = url.replace(/^https?:\/\//, "googlechromes://");
  }
}

function openInSafari(url: string) {
  // x-safari- scheme works in most iOS in-app browsers
  window.location.href = "x-safari-" + url;
}

export function InAppBrowserBanner({
  dismissible = false,
  url: urlProp,
  onDismiss,
}: {
  dismissible?: boolean;
  /** URL to open in the external browser — defaults to the current page */
  url?: string;
  onDismiss?: () => void;
}) {
  const [show, setShow]         = useState(false);
  const [appName, setAppName]   = useState("");
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const { inApp, appName } = detectInApp();
    if (inApp) {
      setShow(true);
      setAppName(appName);
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  if (!show) return null;

  const url = urlProp ?? window.location.href;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-2xl" style={{ gap: 0 }}>
        <div className="text-5xl mb-4">🌐</div>
        <h2 className="text-xl font-bold text-gray-900 leading-snug mb-2">
          Open in your browser
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          You're inside {appName}'s browser. Google sign-in requires Chrome or Safari.
        </p>

        <div className="flex flex-col gap-3">
          {isAndroid ? (
            <button
              onClick={() => openInChrome(url, true)}
              className="w-full bg-[#F05A28] text-white font-bold py-3.5 px-6 rounded-xl text-sm uppercase tracking-widest"
            >
              Open in Chrome
            </button>
          ) : (
            <>
              <button
                onClick={() => openInSafari(url)}
                className="w-full bg-[#F05A28] text-white font-bold py-3.5 px-6 rounded-xl text-sm uppercase tracking-widest"
              >
                Open in Safari
              </button>
              <button
                onClick={() => openInChrome(url, false)}
                className="w-full bg-gray-100 text-gray-800 font-bold py-3.5 px-6 rounded-xl text-sm uppercase tracking-widest"
              >
                Open in Chrome
              </button>
            </>
          )}
        </div>

        {dismissible && (
          <button
            onClick={() => (onDismiss ? onDismiss() : setShow(false))}
            className="mt-4 text-xs text-gray-400 underline underline-offset-2"
          >
            Continue anyway
          </button>
        )}
      </div>
    </div>
  );
}
