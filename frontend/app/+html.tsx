import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * HTML template for the Expo web/PWA build.
 * Injects viewport-fit=cover and safe-area CSS BEFORE the app renders,
 * which ensures useSafeAreaInsets() returns correct values from the first render.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* CRITICAL: viewport-fit=cover must be here (in HTML head) not in JS useEffect */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA / iOS standalone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              height: 100%;
              background-color: #000;
              overflow: hidden;
            }
            * { box-sizing: border-box; }

            /*
             * Ensure the bottom tab bar on web always clears the device
             * safe area (home indicator on iPhone, gesture bar on Android).
             * env(safe-area-inset-bottom) requires viewport-fit=cover above.
             */
            :root {
              --safe-bottom: env(safe-area-inset-bottom, 0px);
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
