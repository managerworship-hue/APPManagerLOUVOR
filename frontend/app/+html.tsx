import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * HTML template para o build web/PWA.
 * CRÍTICO: viewport-fit=cover e manifest DEVEM estar aqui (HTML estático),
 * NÃO em useEffect — para que useSafeAreaInsets() leia valores corretos
 * desde o primeiro render e o browser reconheça a app como PWA instalável.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* viewport-fit=cover é obrigatório para env(safe-area-inset-bottom) funcionar */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA manifest — OBRIGATÓRIO para instalação e ícone na home screen */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS standalone / ícone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Manager Louvor" />
        <link rel="apple-touch-icon" href="/icons/icon.png" />

        {/* Android theme color */}
        <meta name="theme-color" content="#000000" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              height: 100%;
              background-color: #000;
            }
            * { box-sizing: border-box; }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
