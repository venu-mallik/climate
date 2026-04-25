import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script';

export default function Document() {
  return (
    <Html lang="en">
      <Head >
        <Script strategy='beforeInteractive'
          type="module"
          src="https://cdn.jsdelivr.net/npm/@finos/perspective/dist/cdn/perspective.js"
          onLoad={(e)=> {
              console.log('perspective loaded', e);
          }}
        ></Script>
        <Script strategy='afterInteractive'
          type="module"
          src="https://cdn.jsdelivr.net/npm/@finos/perspective-viewer/dist/cdn/perspective-viewer.js"
        ></Script>
        <Script strategy='afterInteractive'
          type="module" 
          src="https://cdn.jsdelivr.net/npm/@finos/perspective-viewer-datagrid/dist/cdn/perspective-viewer-datagrid.js"
        ></Script>
        <Script strategy='afterInteractive'
          type="module"
          src="https://cdn.jsdelivr.net/npm/@finos/perspective-viewer-d3fc/dist/cdn/perspective-viewer-d3fc.js"
        ></Script>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@finos/perspective-viewer/dist/css/pro.css"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}