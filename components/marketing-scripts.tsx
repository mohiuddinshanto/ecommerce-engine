import Script from "next/script";

export type MarketingPixels = {
  googleAnalyticsId?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  gtmId?: string;
};

const PATTERNS = {
  googleAnalyticsId: /^G-[A-Z0-9]+$/i,
  gtmId: /^GTM-[A-Z0-9]+$/i,
  metaPixelId: /^\d{5,20}$/,
  tiktokPixelId: /^[A-Z0-9]{5,30}$/i,
};

// Pixel IDs are admin-controlled but still interpolated into inline scripts, so
// each value must match its provider's format before it is emitted.
function clean(value: unknown, key: keyof typeof PATTERNS): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return PATTERNS[key].test(trimmed) ? trimmed : undefined;
}

export function MarketingScripts({ pixels }: { pixels?: MarketingPixels | null }) {
  if (!pixels) return null;
  const ga = clean(pixels.googleAnalyticsId, "googleAnalyticsId");
  const gtm = clean(pixels.gtmId, "gtmId");
  const meta = clean(pixels.metaPixelId, "metaPixelId");
  const tiktok = clean(pixels.tiktokPixelId, "tiktokPixelId");

  return (
    <>
      {gtm ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      ) : null}
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      ) : null}
      {meta ? (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      ) : null}
      {tiktok ? (
        <Script id="tiktok-pixel-init" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
      ) : null}
    </>
  );
}
