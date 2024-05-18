import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script';

export default function Document() {
  return (
    <Html lang="en">
      <Head >
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"
          integrity="sha256-kLaT2GOSpHechhsozzB+flnD+zUyjE2LlfWPgU04xyI="
          crossOrigin="" />
        <script async src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"
          integrity="sha256-WBkoXOwTeyKclOHuWtc+i2uENFpDZ9YPdf5Hf+D7ewM="
          crossOrigin=""></script>
        <Script strategy='beforeInteractive'
          type="module"
          src="https://cdn.jsdelivr.net/npm/@finos/perspective/dist/cdn/perspective.js"
          onLoad={(e)=> {
              console.log('perspective loaded', e);
              console.log(e);
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
          crossorigin="anonymous"
          href="https://cdn.jsdelivr.net/npm/@finos/perspective-viewer/dist/css/pro.css"
        />
      </Head>
      <body>
        <Main />
        {/*<div id="map" style={{height: 400}}></div>*/}
        <NextScript />
      </body>
    </Html>
  )
}
