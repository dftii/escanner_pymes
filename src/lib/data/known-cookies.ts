/**
 * Catálogos para el check de cookies y RGPD. Ampliables sin tocar la lógica.
 * Clasificación según la Guía de cookies de la AEPD (2023).
 */

export type CookieKind = 'technical' | 'preferences' | 'analytics' | 'advertising';

export type CookieRule = { pattern: RegExp; kind: CookieKind; owner: string };

/** Cookies conocidas por nombre. El orden importa: gana la primera que encaje. */
export const KNOWN_COOKIES: readonly CookieRule[] = [
  // Técnicas / necesarias (exentas de consentimiento)
  {
    pattern: /^(PHPSESSID|JSESSIONID|ASP\.NET_SessionId|ASPSESSIONID\w*|CFID|CFTOKEN)$/i,
    kind: 'technical',
    owner: 'Sesión del servidor',
  },
  {
    pattern:
      /^(laravel_session|XSRF-TOKEN|csrftoken|csrf_token|_csrf|sessionid|connect\.sid|_session_id|ci_session)$/i,
    kind: 'technical',
    owner: 'Sesión / seguridad',
  },
  {
    pattern:
      /^(wordpress_test_cookie|wordpress_logged_in_\w+|wordpress_sec_\w+|wp-settings(-time)?-\d+|wordpress_\w+)$/i,
    kind: 'technical',
    owner: 'WordPress',
  },
  {
    pattern: /^(woocommerce_\w+|wp_woocommerce_session_\w+)$/i,
    kind: 'technical',
    owner: 'WooCommerce',
  },
  {
    pattern: /^(__cf_bm|cf_clearance|_cfuvid|__cflb|cf_ob_info|cf_use_ob)$/i,
    kind: 'technical',
    owner: 'Cloudflare',
  },
  {
    pattern:
      /^(AWSALB|AWSALBCORS|AWSELB|AWSALBTG\w*|ARRAffinity\w*|SERVERID|BIGipServer\w*|incap_ses_\w+|visid_incap_\w+|nlbi_\w+)$/i,
    kind: 'technical',
    owner: 'Balanceador / CDN',
  },
  {
    pattern:
      /^(cart|cart_sig|cart_ts|cart_currency|secure_customer_sig|localization|_tracking_consent|_cmp_a|keep_alive|_secure_session_id)$/i,
    kind: 'technical',
    owner: 'Shopify',
  },
  {
    pattern: /^(_shopify_s|_shopify_y|_shopify_sa_t|_shopify_sa_p|_orig_referrer|_landing_page)$/i,
    kind: 'analytics',
    owner: 'Shopify Analytics',
  },
  {
    pattern:
      /^(XSRF-TOKEN|svSession|hs|ssr-caching|bSession|TS\w{6,}|ctx|fedops\.logger\.sessionId)$/i,
    kind: 'technical',
    owner: 'Plataforma web',
  },
  { pattern: /^(PrestaShop-\w+)$/i, kind: 'technical', owner: 'PrestaShop' },
  // Cookies del propio gestor de consentimiento (necesarias)
  {
    pattern:
      /^(CookieConsent|CookieConsentBulkSetting\w*|OptanonConsent|OptanonAlertBoxClosed|cookieyes-consent|cmplz_\w+|_iub_cs-\w+|euconsent(-v2)?|usercentrics\w*|uc_\w+|didomi_token|borlabs-cookie|cookie_notice_accepted|cookielawinfo-\w+|viewed_cookie_policy|moove_gdpr_popup|CookieScriptConsent|axeptio_\w+|cookiehub|real_cookie_banner\w*|rcb-\w+|cc_cookie)$/i,
    kind: 'technical',
    owner: 'Gestor de consentimiento',
  },
  // Preferencias
  {
    pattern:
      /^(pll_language|wp-wpml_current_language|_icl_current_language|lang|language|locale|qtrans_\w+)$/i,
    kind: 'preferences',
    owner: 'Idioma',
  },
  // Analítica
  {
    pattern: /^(_ga|_gid|_gat(_\w+)?|_ga_\w+|__utm[a-z]|_dc_gtm_\w+|AMP_TOKEN)$/i,
    kind: 'analytics',
    owner: 'Google Analytics',
  },
  {
    pattern:
      /^(_hjid|_hjSession\w*|_hjIncludedInSessionSample\w*|_hjFirstSeen|_hjAbsoluteSessionInProgress|_hj\w+)$/i,
    kind: 'analytics',
    owner: 'Hotjar',
  },
  { pattern: /^(_clck|_clsk|CLID|ANONCHK|SM|MR)$/i, kind: 'analytics', owner: 'Microsoft Clarity' },
  {
    pattern: /^(_pk_id\.\w+|_pk_ses\.\w+|_pk_ref\.\w+|MATOMO_SESSID|mtm_\w+)$/i,
    kind: 'analytics',
    owner: 'Matomo',
  },
  {
    pattern: /^(mp_\w+_mixpanel|ajs_user_id|ajs_anonymous_id|_vwo_\w+|_uetsid|_uetvid)$/i,
    kind: 'analytics',
    owner: 'Analítica de terceros',
  },
  {
    pattern: /^(__hstc|__hssc|__hssrc|hubspotutk|messagesUtk)$/i,
    kind: 'analytics',
    owner: 'HubSpot',
  },
  // Publicidad
  { pattern: /^(_fbp|_fbc|fr|tr)$/i, kind: 'advertising', owner: 'Meta (Facebook)' },
  {
    pattern: /^(_gcl_au|_gcl_aw|_gcl_dc|IDE|test_cookie|DSID|NID|__gads|__gpi|_gac_\w+)$/i,
    kind: 'advertising',
    owner: 'Google Ads',
  },
  { pattern: /^(MUID|_uetmsclkid)$/i, kind: 'advertising', owner: 'Microsoft Ads' },
  { pattern: /^(_ttp|_tt_enable_cookie|ttwid)$/i, kind: 'advertising', owner: 'TikTok' },
  {
    pattern:
      /^(li_sugr|bcookie|lidc|UserMatchHistory|AnalyticsSyncHistory|li_fat_id|lms_ads|lms_analytics)$/i,
    kind: 'advertising',
    owner: 'LinkedIn',
  },
  {
    pattern: /^(_pin_unauth|_pinterest_\w+|_routing_id)$/i,
    kind: 'advertising',
    owner: 'Pinterest',
  },
  { pattern: /^(_scid|_sctr|sc_at)$/i, kind: 'advertising', owner: 'Snapchat' },
  {
    pattern: /^(personalization_id|guest_id|muc_ads)$/i,
    kind: 'advertising',
    owner: 'X (Twitter)',
  },
  {
    pattern: /^(YSC|VISITOR_INFO1_LIVE|VISITOR_PRIVACY_METADATA)$/i,
    kind: 'advertising',
    owner: 'YouTube',
  },
];

export type TrackerRule = {
  name: string;
  kind: Exclude<CookieKind, 'technical' | 'preferences'>;
  /** Coincide con el `src` de un <script>. */
  src?: RegExp;
  /** Coincide con el código de un <script> en línea. */
  inline?: RegExp;
};

/** Scripts de analítica y publicidad que necesitan consentimiento. */
export const TRACKERS: readonly TrackerRule[] = [
  {
    name: 'Google Tag Manager',
    kind: 'analytics',
    src: /googletagmanager\.com\/gtm\.js/i,
    inline: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/,
  },
  {
    name: 'Google Analytics',
    kind: 'analytics',
    src: /googletagmanager\.com\/gtag\/js|google-analytics\.com\/(analytics|ga)\.js/i,
    inline: /gtag\(\s*['"]config['"]\s*,\s*['"](G|UA)-|google-analytics\.com\/analytics\.js/,
  },
  {
    name: 'Google Ads',
    kind: 'advertising',
    src: /googleadservices\.com|googlesyndication\.com|doubleclick\.net/i,
    inline: /gtag\(\s*['"]config['"]\s*,\s*['"]AW-/,
  },
  {
    name: 'Meta Pixel (Facebook)',
    kind: 'advertising',
    src: /connect\.facebook\.net\/[^"']*\/fbevents\.js/i,
    inline: /fbq\(\s*['"]init['"]|connect\.facebook\.net\/[^"']*\/fbevents\.js/,
  },
  {
    name: 'Hotjar',
    kind: 'analytics',
    src: /static\.hotjar\.com/i,
    inline: /_hjSettings|static\.hotjar\.com/,
  },
  {
    name: 'Microsoft Clarity',
    kind: 'analytics',
    src: /clarity\.ms\/tag/i,
    inline: /clarity\.ms\/tag/,
  },
  {
    name: 'LinkedIn Insight',
    kind: 'advertising',
    src: /snap\.licdn\.com/i,
    inline: /_linkedin_partner_id|snap\.licdn\.com/,
  },
  {
    name: 'TikTok Pixel',
    kind: 'advertising',
    src: /analytics\.tiktok\.com/i,
    inline: /analytics\.tiktok\.com|ttq\.load\(/,
  },
  {
    name: 'Pinterest Tag',
    kind: 'advertising',
    src: /s\.pinimg\.com\/ct\/core\.js/i,
    inline: /pintrk\(\s*['"]load['"]/,
  },
  { name: 'HubSpot', kind: 'analytics', src: /js\.hs-scripts\.com|js\.hs-analytics\.net/i },
  {
    name: 'Microsoft Ads (UET)',
    kind: 'advertising',
    src: /bat\.bing\.com\/bat\.js/i,
    inline: /bat\.bing\.com\/bat\.js/,
  },
  {
    name: 'Yandex Metrica',
    kind: 'analytics',
    src: /mc\.yandex\.ru\/metrika/i,
    inline: /mc\.yandex\.ru\/metrika/,
  },
  {
    name: 'Matomo',
    kind: 'analytics',
    src: /matomo\.js|piwik\.js/i,
    inline: /_paq\.push\(\s*\[\s*['"]trackPageView/,
  },
];

export type CmpRule = { name: string; pattern: RegExp };

/** Gestores de consentimiento (CMP), por script, clase o atributo en el HTML. */
export const CMPS: readonly CmpRule[] = [
  { name: 'Cookiebot', pattern: /consent\.cookiebot\.(com|eu)|data-cbid=/i },
  { name: 'OneTrust', pattern: /cdn\.cookielaw\.org|otSDKStub\.js|optanon/i },
  { name: 'CookieYes', pattern: /cdn-cookieyes\.com|cookieyes/i },
  { name: 'Complianz', pattern: /complianz|cmplz-/i },
  { name: 'iubenda', pattern: /iubenda\.com\/cs|_iub_cs|iubenda-cs/i },
  { name: 'Usercentrics', pattern: /usercentrics\.eu|usercentrics-cmp/i },
  { name: 'Didomi', pattern: /sdk\.privacy-center\.org|didomi/i },
  { name: 'Quantcast Choice', pattern: /quantcast\.mgr\.consensu\.org|cmp\.quantcast\.com/i },
  { name: 'consentmanager', pattern: /consentmanager\.net/i },
  { name: 'Termly', pattern: /app\.termly\.io/i },
  { name: 'Cookie Script', pattern: /cookie-script\.com/i },
  { name: 'Osano', pattern: /cmp\.osano\.com|cookieconsent(\.min)?\.js|cc-window/i },
  { name: 'Axeptio', pattern: /axept\.io|axeptio/i },
  { name: 'CookieHub', pattern: /cookiehub\.net/i },
  { name: 'Borlabs Cookie', pattern: /borlabs-cookie/i },
  { name: 'Real Cookie Banner', pattern: /real-cookie-banner/i },
  { name: 'Cookie Notice (WordPress)', pattern: /cookie-notice-front|id=["']cookie-notice/i },
  {
    name: 'CookieYes / GDPR Cookie Consent (WordPress)',
    pattern: /cookie-law-info|cli-bar|wt-cli/i,
  },
  { name: 'GDPR Cookie Compliance (WordPress)', pattern: /moove_gdpr|moove-gdpr/i },
  { name: 'Klaro', pattern: /klaro(\.min)?\.js|klaro-config/i },
  { name: 'tarteaucitron', pattern: /tarteaucitron/i },
  { name: 'vanilla-cookieconsent', pattern: /cookieconsent\.umd|cc--main|id=["']cc-main/i },
  {
    name: 'Shopify (banner de privacidad)',
    pattern: /shopify-privacy-banner|privacy-banner\.js|consent-tracking-api/i,
  },
  { name: 'Wix (banner de cookies)', pattern: /consent-policy|wix-cookie-consent/i },
];

/** Atributos con los que los CMP bloquean scripts hasta que hay consentimiento. */
export const BLOCKED_SCRIPT_ATTRS = [
  'data-cookieconsent', // Cookiebot
  'data-category', // Complianz, vanilla-cookieconsent
  'data-cookieyes', // CookieYes
  'data-cookiecategory', // varios
  'data-usercentrics', // Usercentrics
  'data-type', // Klaro y otros
  'data-borlabs-cookie-script-blocker-id',
  'data-cmplz-src',
] as const;
