import type { RemediationId } from './remediation';

/** Steps to fix each problem, in English. */
export const REMEDIATION_EN: Record<RemediationId, readonly string[]> = {
  'ssl.no_https': [
    'Turn on a free SSL certificate: in cPanel go to "SSL/TLS Status" or "Let\'s Encrypt"; in Plesk, to "Let\'s Encrypt" on your domain.',
    'On Wix and Shopify the certificate is automatic: check in the dashboard that the domain is connected correctly.',
    'If you cannot find the option, ask your hosting provider to enable "HTTPS with Let\'s Encrypt".',
  ],
  'ssl.untrusted': [
    "Replace the certificate with one from a recognised authority. Let's Encrypt is free and almost every host offers it.",
    'cPanel: "SSL/TLS Status" → "Run AutoSSL". Plesk: "Let\'s Encrypt" → "Install".',
    "If someone installed the certificate by hand, ask them to renew it with Let's Encrypt and turn on automatic renewal.",
  ],
  'ssl.chain': [
    'The intermediate certificate is missing. When installing the certificate, also paste the "CA bundle" or "chain" the issuer gave you.',
    'cPanel: "SSL/TLS" → "Manage SSL sites" → fill in the "Certificate Authority Bundle" field.',
    "If you use Let's Encrypt with AutoSSL, issue it again: the chain is installed automatically.",
  ],
  'ssl.expiry': [
    'Renew the certificate as soon as possible from your hosting dashboard.',
    'Turn on automatic renewal (AutoSSL in cPanel, "Keep secured" in Plesk) so it does not happen again.',
    'Wix and Shopify renew it for you: if it expires, check the domain still points to them.',
  ],
  'ssl.hostname': [
    'Issue the certificate again including every name of your website (with and without www).',
    'In cPanel/Plesk, when issuing with Let\'s Encrypt tick the option to include "www".',
    'On Wix and Shopify, connect both versions of the domain from the domains dashboard.',
  ],
  'ssl.www': [
    'Include both the www and non-www versions in the certificate, or make one redirect to the other.',
    'In cPanel/Plesk, issue the Let\'s Encrypt certificate ticking "www" as well.',
  ],
  'ssl.protocol': [
    'Ask your host to disable TLS 1.0 and 1.1 and leave only TLS 1.2 and 1.3.',
    'Plesk: "Tools & Settings" → "SSL/TLS Settings". On your own servers, adjust "ssl_protocols" (nginx) or "SSLProtocol" (Apache).',
  ],
  'ssl.mixed_content': [
    'Change "http://" to "https://" in those addresses (almost every service already works over https).',
    'WordPress: the "Better Search Replace" plugin changes old URLs in the database in one go; check the theme and widgets too.',
    'If a resource only exists over http, download it and upload it to your own website, or find an alternative.',
    'As a safety net, add the header "Content-Security-Policy: upgrade-insecure-requests".',
  ],
  'ssl.redirect': [
    'Make your website always take visitors to the secure version (https).',
    'WordPress: in "Settings" → "General" set both addresses with https:// and enable a plugin such as "Really Simple SSL".',
    'cPanel: "Domains" → enable "Force HTTPS Redirect". Plesk: "Hosting Settings" → "Permanent SEO-safe 301 redirect from HTTP to HTTPS".',
    'Wix and Shopify do it automatically once SSL is active.',
  ],
  'headers.hsts': [
    'Add the header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    'WordPress: plugins such as "Really Simple SSL" or "Headers Security Advanced & HSTS WP" turn it on with one click.',
    'cPanel/Apache: in .htaccess add: Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    'Plesk: "Hosting Settings" → enable "HSTS". Shopify and Wix already send it.',
  ],
  'headers.csp': [
    "Start with a basic policy and refine it: Content-Security-Policy: frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    'Try it first with "Content-Security-Policy-Report-Only" so nothing breaks.',
    'WordPress: the "Headers Security Advanced & HSTS WP" plugin lets you set it up without touching code.',
  ],
  'headers.xcto': [
    'Add the header: X-Content-Type-Options: nosniff',
    'cPanel/Apache: in .htaccess add: Header always set X-Content-Type-Options "nosniff"',
    'nginx: add_header X-Content-Type-Options "nosniff" always;',
  ],
  'headers.framing': [
    "Add the header: X-Frame-Options: SAMEORIGIN (or in the CSP: frame-ancestors 'self').",
    'cPanel/Apache: in .htaccess add: Header always set X-Frame-Options "SAMEORIGIN"',
    'WordPress: security plugins (Wordfence, "Headers Security Advanced") include it.',
  ],
  'headers.referrer': [
    'Add the header: Referrer-Policy: strict-origin-when-cross-origin',
    'cPanel/Apache: in .htaccess add: Header always set Referrer-Policy "strict-origin-when-cross-origin"',
  ],
  'headers.permissions': [
    'Add the header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
    'Adjust the list if your website does use one of those features (for example, a map with your location).',
  ],
  'headers.disclosure': [
    'Hide the server and language version: there is no need to announce which software you use.',
    'Apache: "ServerTokens Prod" and "ServerSignature Off". nginx: "server_tokens off;". PHP: "expose_php = Off" in php.ini.',
    'On shared hosting, ask your provider or use a security plugin that removes "X-Powered-By".',
  ],
  'email.spf': [
    'Create a TXT record on the domain (not on "www") listing the servers that send your email, ending in "-all" or "~all".',
    'Google Workspace: v=spf1 include:_spf.google.com ~all · Microsoft 365: v=spf1 include:spf.protection.outlook.com -all',
    'Hosting email (cPanel): "Email" → "Email Deliverability" → "Repair" on SPF. Plesk: the domain\'s "DNS Settings".',
    'If the domain does not send email: v=spf1 -all',
  ],
  'email.spf_multiple': [
    'Merge every record starting with "v=spf1" into a single one, with all the "include" entries and a single "-all" or "~all" at the end.',
    'Example: v=spf1 include:_spf.google.com include:servers.mcsv.net ~all',
  ],
  'email.spf_lookups': [
    'Remove the "include" entries for services you no longer use (old newsletters, CRM, previous host).',
    'Replace "a" and "mx" with the specific IPs (ip4:…) if there are only a few.',
    'If that is still not enough, an "SPF flattening" service can condense it; ask whoever manages your domain for help.',
  ],
  'email.spf_softfail': [
    'Once DMARC is on "quarantine" or "reject", "~all" is enough.',
    'If you do not have DMARC, change the ending to "-all" once you have checked that all your legitimate senders are included.',
  ],
  'email.dmarc': [
    'Create a TXT record at "_dmarc.yourdomain.com" with: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
    'Review the reports for 2-4 weeks and, if your legitimate email passes, move to "p=quarantine" and then to "p=reject".',
    'Google Workspace, Microsoft 365, cPanel ("Email Deliverability") and most DNS dashboards let you add it in minutes.',
  ],
  'email.dmarc_none': [
    'Review the DMARC reports (free services such as dmarcian or Postmark summarise them) to confirm your legitimate email passes.',
    'Change the policy to "p=quarantine" and, after a few weeks without problems, to "p=reject".',
    'Remove "pct=" or set it to 100 so it applies to every email.',
  ],
  'email.dkim': [
    'Turn on DKIM signing with your email provider and publish the record it gives you.',
    'Google Workspace: Admin console → Gmail → "Authenticate email". Microsoft 365: Defender → "DKIM".',
    'cPanel: "Email" → "Email Deliverability". Plesk: "Mail Settings" → "Use DKIM".',
  ],
  'email.exposed': [
    'Use a contact form instead of showing the address, or show only a generic mailbox (info@, contact@).',
    'Cloudflare (free plan): enable "Email Address Obfuscation" under "Scrape Shield".',
    'WordPress: plugins such as "Email Address Encoder" hide addresses from robots without your customers noticing.',
    'Avoid publishing personal addresses (first.last@) or Gmail/Hotmail ones: use one on your own domain.',
  ],
  'headers.cms': [
    'Make a full backup (files and database) and update from the admin dashboard: Dashboard > Updates in WordPress.',
    'Update the plugins and theme too: they are usually the most common way in.',
    'Turn on automatic security updates and delete plugins you do not use.',
    'If you are not confident doing it, your hosting company or developer can do it quickly; many hosts include it for free.',
  ],
  'headers.cms_info': [
    'Keep the core, plugins and theme up to date, with automatic updates if you can.',
    'To hide the version in WordPress, security plugins (Wordfence, Solid Security) have an option for it.',
  ],
  'privacy.cookies': [
    'Install a consent management platform (CMP) that blocks these cookies until the user clicks "Accept".',
    'WordPress: Complianz, CookieYes or Cookiebot block scripts automatically. Shopify and Wix have their own banner in the dashboard.',
    'If the cookie is set by your own server or a plugin, configure it not to create the cookie until there is consent.',
  ],
  'privacy.cookies_unknown': [
    'Find out what each cookie is for (your developer or the plugin that creates it can tell you).',
    'If it is technical (session, basket, security), you do not need consent: list it in the cookie policy.',
    'If it is for analytics or advertising, block it until the user accepts.',
  ],
  'privacy.cookies_js': [
    'Configure your consent manager to block analytics and advertising scripts until the user clicks "Accept" (showing the banner is not enough).',
    'With Google Tag Manager, enable Consent Mode v2 with everything set to "denied" by default and make tags wait for consent.',
    'Check plugins that add pixels (Facebook, TikTok, Hotjar…): many load on their own, outside the consent manager.',
    'Check the result in a private window: before accepting, the browser tools (Application > Cookies) should show no third-party cookies.',
  ],
  'privacy.trackers': [
    'Make these scripts load only after the user accepts: consent managers (Cookiebot, Complianz, CookieYes…) do this by tagging each script with its category.',
    'With Google Tag Manager, enable Consent Mode v2 and set the default permissions to "denied".',
    'If you do not use the data from one of these tools, remove it: fewer scripts, less risk.',
  ],
  'privacy.banner': [
    'Install a cookie banner with "Accept", "Reject" and "Settings" buttons on the first layer, all equally prominent.',
    'WordPress: Complianz or CookieYes (both have a free version). Shopify: "Customer privacy" in Settings. Wix: "Cookie banner" in Settings.',
    'A notice like "by continuing to browse you accept" is not valid: the Spanish DPA (AEPD) requires a clear action from the user.',
  ],
  'privacy.legal_notice': [
    'Create a "Legal notice" page with: name or company name, tax ID (NIF/CIF), address, contact email and registry details if you have them.',
    'Link to it from the footer of every page.',
    'The legal text generators in consent managers (Complianz, iubenda) or your accountant can help you.',
  ],
  'privacy.privacy_policy': [
    'Create a "Privacy policy" page with: controller, purposes, legal basis, retention periods, recipients and how to exercise data rights.',
    'Link to it from the footer and from every form.',
    'The Spanish DPA (AEPD) has a free tool, "Facilita RGPD", for small businesses.',
  ],
  'privacy.cookie_policy': [
    'Create a "Cookie policy" page listing the cookies, what each is for, who sets it and how long it lasts.',
    'Link to it from the footer and from the cookie banner. Many consent managers (Cookiebot, Complianz) generate and update it for you.',
  ],
  'privacy.breaches': [
    'If you did not do so at the time, notify the data protection authority and the people affected: the GDPR requires personal data breaches to be reported.',
    'Force a password change on customer accounts and store passwords with a secure algorithm (bcrypt or Argon2).',
    'Tell your customers you will never ask for passwords or payments by email, so they are wary of phishing.',
    'Find out how it happened and keep the content management system (WordPress, PrestaShop…) and its plugins up to date.',
  ],
  'privacy.forms': [
    'Next to the submit button, add the "basic information" on data protection: controller, purpose, rights and a link to the privacy policy.',
    'Checkboxes for advertising or newsletters must be unticked by default.',
    'Make sure the form is submitted over https.',
    'WordPress (Contact Form 7, WPForms, Elementor): all of them let you add an acceptance checkbox and legal text.',
  ],
};
