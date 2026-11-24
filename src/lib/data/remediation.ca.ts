import type { RemediationId } from './remediation';

/** Passos per arreglar cada problema, en català. */
export const REMEDIATION_CA: Record<RemediationId, readonly string[]> = {
  'ssl.no_https': [
    'Activa un certificat SSL gratuït: a cPanel ves a "SSL/TLS Status" o "Let\'s Encrypt"; a Plesk, a "Let\'s Encrypt" al teu domini.',
    'A Wix i Shopify el certificat és automàtic: comprova al tauler que el domini està ben connectat.',
    "Si no trobes l'opció, demana al teu proveïdor d'allotjament que activi \"HTTPS amb Let's Encrypt\".",
  ],
  'ssl.untrusted': [
    "Substitueix el certificat per un d'una autoritat reconeguda. Let's Encrypt és gratuït i l'ofereixen gairebé tots els allotjaments.",
    'A cPanel: "SSL/TLS Status" → "Run AutoSSL". A Plesk: "Let\'s Encrypt" → "Instal·lar".',
    "Si algú va instal·lar el certificat a mà, demana-li que el renovi amb Let's Encrypt i activi la renovació automàtica.",
  ],
  'ssl.chain': [
    'Hi falta el certificat intermedi. En instal·lar el certificat, enganxa també el "CA bundle" o "cadena" que et va donar l\'emissor.',
    'A cPanel: "SSL/TLS" → "Manage SSL sites" → omple el camp "Certificate Authority Bundle".',
    "Si fas servir Let's Encrypt amb AutoSSL, torna'l a emetre: la cadena s'instal·la sola.",
  ],
  'ssl.expiry': [
    'Renova el certificat com més aviat millor des del tauler del teu allotjament.',
    'Activa la renovació automàtica (AutoSSL a cPanel, "Mantenir protegit" a Plesk) perquè no torni a passar.',
    'Wix i Shopify el renoven sols: si caduca, revisa que el domini encara hi apunti.',
  ],
  'ssl.hostname': [
    'Torna a emetre el certificat incloent-hi tots els noms del teu web (amb www i sense).',
    "A cPanel/Plesk, en emetre amb Let's Encrypt marca l'opció d'incloure \"www\".",
    'A Wix i Shopify, connecta totes dues versions del domini des del tauler de dominis.',
  ],
  'ssl.www': [
    "Inclou la versió amb www i sense al certificat, o fes que una redirigeixi a l'altra.",
    'A cPanel/Plesk, emet el certificat de Let\'s Encrypt marcant també "www".',
  ],
  'ssl.protocol': [
    'Demana al teu allotjament que desactivi TLS 1.0 i 1.1 i deixi només TLS 1.2 i 1.3.',
    'A Plesk: "Eines i configuració" → "Configuració de SSL/TLS". En servidors propis, ajusta "ssl_protocols" (nginx) o "SSLProtocol" (Apache).',
  ],
  'ssl.mixed_content': [
    'Canvia "http://" per "https://" en aquestes adreces (gairebé tots els serveis ja funcionen amb https).',
    'WordPress: el plugin "Better Search Replace" canvia de cop les URL antigues a la base de dades; revisa també el tema i els ginys.',
    "Si un recurs només existeix per http, descarrega'l i puja'l al teu propi web, o busca una alternativa.",
    'Com a xarxa de seguretat, afegeix la capçalera "Content-Security-Policy: upgrade-insecure-requests".',
  ],
  'ssl.redirect': [
    'Fes que el teu web porti sempre a la versió segura (https).',
    'WordPress: a "Configuració" → "General" posa les dues adreces amb https:// i activa un plugin com "Really Simple SSL".',
    'cPanel: "Dominis" → activa "Forçar la redirecció HTTPS". Plesk: "Configuració d\'allotjament" → "Redirecció permanent 301 d\'HTTP a HTTPS".',
    "Wix i Shopify ho fan sols quan tenen l'SSL actiu.",
  ],
  'headers.hsts': [
    'Afegeix la capçalera: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    'WordPress: plugins com "Really Simple SSL" o "Headers Security Advanced & HSTS WP" l\'activen amb un clic.',
    'cPanel/Apache: a .htaccess afegeix: Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    'Plesk: "Configuració d\'allotjament" → activa "HSTS". Shopify i Wix ja l\'envien.',
  ],
  'headers.csp': [
    "Comença amb una política bàsica i ves-la ajustant: Content-Security-Policy: frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    'Prova-la primer amb "Content-Security-Policy-Report-Only" per no trencar res.',
    'WordPress: el plugin "Headers Security Advanced & HSTS WP" permet configurar-la sense tocar codi.',
  ],
  'headers.xcto': [
    'Afegeix la capçalera: X-Content-Type-Options: nosniff',
    'cPanel/Apache: a .htaccess afegeix: Header always set X-Content-Type-Options "nosniff"',
    'nginx: add_header X-Content-Type-Options "nosniff" always;',
  ],
  'headers.framing': [
    "Afegeix la capçalera: X-Frame-Options: SAMEORIGIN (o a la CSP: frame-ancestors 'self').",
    'cPanel/Apache: a .htaccess afegeix: Header always set X-Frame-Options "SAMEORIGIN"',
    'WordPress: els plugins de seguretat (Wordfence, "Headers Security Advanced") la inclouen.',
  ],
  'headers.referrer': [
    'Afegeix la capçalera: Referrer-Policy: strict-origin-when-cross-origin',
    'cPanel/Apache: a .htaccess afegeix: Header always set Referrer-Policy "strict-origin-when-cross-origin"',
  ],
  'headers.permissions': [
    'Afegeix la capçalera: Permissions-Policy: camera=(), microphone=(), geolocation=()',
    "Ajusta la llista si el teu web sí que fa servir alguna d'aquestes funcions (per exemple, un mapa amb la teva ubicació).",
  ],
  'headers.disclosure': [
    'Amaga la versió del servidor i del llenguatge: no cal anunciar quin programari fas servir.',
    'Apache: "ServerTokens Prod" i "ServerSignature Off". nginx: "server_tokens off;". PHP: "expose_php = Off" a php.ini.',
    'En allotjament compartit, demana-ho al proveïdor o fes servir un plugin de seguretat que tregui "X-Powered-By".',
  ],
  'email.spf': [
    'Crea un registre TXT al domini (no a "www") amb els servidors que envien el teu correu i que acabi en "-all" o "~all".',
    'Google Workspace: v=spf1 include:_spf.google.com ~all · Microsoft 365: v=spf1 include:spf.protection.outlook.com -all',
    'Correu de l\'allotjament (cPanel): "Correu electrònic" → "Lliurament del correu" → "Reparar" a SPF. Plesk: "Configuració DNS" del domini.',
    'Si el domini no envia correu: v=spf1 -all',
  ],
  'email.spf_multiple': [
    'Ajunta tots els registres que comencen per "v=spf1" en un de sol, amb tots els "include" i un únic "-all" o "~all" al final.',
    'Exemple: v=spf1 include:_spf.google.com include:servers.mcsv.net ~all',
  ],
  'email.spf_lookups': [
    'Treu els "include" de serveis que ja no facis servir (butlletins antics, CRM, allotjament anterior).',
    'Substitueix "a" i "mx" per les IP concretes (ip4:…) si en són poques.',
    'Si tot i així no n\'hi ha prou, un servei d\'"SPF flattening" el pot resumir; demana ajuda a qui gestioni el teu domini.',
  ],
  'email.spf_softfail': [
    'Quan DMARC estigui en "quarantine" o "reject", "~all" és suficient.',
    'Si no tens DMARC, canvia el final a "-all" un cop comprovat que tots els teus enviaments legítims hi són inclosos.',
  ],
  'email.dmarc': [
    'Crea un registre TXT a "_dmarc.elteudomini.cat" amb: v=DMARC1; p=none; rua=mailto:dmarc@elteudomini.cat',
    'Revisa els informes 2-4 setmanes i, si el teu correu legítim passa, puja a "p=quarantine" i després a "p=reject".',
    'Google Workspace, Microsoft 365, cPanel ("Lliurament del correu") i la majoria de taulers DNS permeten afegir-lo en minuts.',
  ],
  'email.dmarc_none': [
    'Revisa els informes DMARC (serveis gratuïts com dmarcian o Postmark els resumeixen) per confirmar que els teus enviaments legítims passen.',
    'Canvia la política a "p=quarantine" i, després d\'unes setmanes sense problemes, a "p=reject".',
    'Treu "pct=" o posa\'l a 100 perquè s\'apliqui a tots els correus.',
  ],
  'email.dkim': [
    "Activa la signatura DKIM al teu proveïdor de correu i publica el registre que t'indiqui.",
    'Google Workspace: Consola d\'administració → Gmail → "Autenticar el correu electrònic". Microsoft 365: Defender → "DKIM".',
    'cPanel: "Correu electrònic" → "Lliurament del correu". Plesk: "Configuració de correu" → "Fer servir DKIM".',
  ],
  'email.exposed': [
    "Fes servir un formulari de contacte en lloc de mostrar l'adreça, o mostra només una bústia genèrica (info@, contacte@).",
    'Cloudflare (pla gratuït): activa "Email Address Obfuscation" a "Scrape Shield".',
    'WordPress: plugins com "Email Address Encoder" amaguen les adreces als robots sense que ho notin els teus clients.',
    'Evita publicar adreces personals (nom.cognom@) o de Gmail/Hotmail: fes-ne servir una del teu domini.',
  ],
  'headers.cms': [
    "Fes una còpia de seguretat completa (fitxers i base de dades) i actualitza des de l'escriptori d'administració: Tauler > Actualitzacions a WordPress.",
    "Actualitza també els plugins i el tema: solen ser la porta d'entrada més habitual.",
    'Activa les actualitzacions automàtiques de seguretat i esborra els plugins que no facis servir.',
    "Si no t'hi atreveixes, la teva empresa d'allotjament o el teu desenvolupador ho fan en poc temps; molts allotjaments ho inclouen gratis.",
  ],
  'headers.cms_info': [
    'Mantén el nucli, els plugins i el tema actualitzats, amb actualitzacions automàtiques si pots.',
    "Per no mostrar la versió a WordPress, els plugins de seguretat (Wordfence, Solid Security) tenen l'opció d'amagar-la.",
  ],
  'privacy.cookies': [
    'Instal·la un gestor de consentiment (CMP) que bloquegi aquestes galetes fins que l\'usuari premi "Acceptar".',
    'WordPress: Complianz, CookieYes o Cookiebot bloquegen els scripts automàticament. Shopify i Wix tenen bàner propi al tauler.',
    "Si la galeta la posa el teu propi servidor o un plugin, configura'l perquè no la creï fins a tenir consentiment.",
  ],
  'privacy.cookies_unknown': [
    "Identifica per a què serveix cada galeta (el teu desenvolupador o el plugin que la crea t'ho pot dir).",
    'Si és tècnica (sessió, cistella, seguretat), no necessites consentiment: inclou-la a la política de galetes.',
    "Si és d'analítica o publicitat, bloqueja-la fins que l'usuari accepti.",
  ],
  'privacy.cookies_js': [
    "Configura el teu gestor de consentiment perquè bloquegi els scripts d'analítica i publicitat fins que l'usuari premi \"Acceptar\" (no n'hi ha prou amb mostrar el bàner).",
    'Amb Google Tag Manager, activa el Consent Mode v2 amb tot en "denied" per defecte i fes que les etiquetes esperin el consentiment.',
    'Revisa els plugins que afegeixen píxels (Facebook, TikTok, Hotjar…): molts es carreguen pel seu compte, fora del gestor de consentiment.',
    "Comprova el resultat en una finestra privada: abans d'acceptar, a les eines del navegador (Aplicació > Galetes) no hi hauria d'haver galetes de tercers.",
  ],
  'privacy.trackers': [
    "Fes que aquests scripts només es carreguin després d'acceptar: els gestors de consentiment (Cookiebot, Complianz, CookieYes…) ho fan marcant cada script amb la seva categoria.",
    'Amb Google Tag Manager, activa el Consent Mode v2 i configura els permisos per defecte com a "denied".',
    "Si no fas servir les dades d'alguna d'aquestes eines, treu-la: menys scripts, menys risc.",
  ],
  'privacy.banner': [
    'Instal·la un bàner de galetes amb botons d\'"Acceptar", "Rebutjar" i "Configurar" a la primera capa, amb el mateix pes visual.',
    'WordPress: Complianz o CookieYes (tenen versió gratuïta). Shopify: "Privadesa dels clients" a Configuració. Wix: "Bàner de galetes" a Configuració.',
    'No val un avís del tipus "si continues navegant acceptes": l\'AEPD exigeix una acció clara de l\'usuari.',
  ],
  'privacy.legal_notice': [
    'Crea una pàgina "Avís legal" amb: nom o raó social, NIF, domicili, correu de contacte i dades registrals si en tens.',
    'Enllaça-la des del peu de totes les pàgines.',
    'Els generadors de textos legals dels gestors de consentiment (Complianz, iubenda) o la teva gestoria et poden ajudar.',
  ],
  'privacy.privacy_policy': [
    'Crea una pàgina "Política de privadesa" amb: responsable, finalitats, base legal, terminis de conservació, destinataris i com exercir els drets.',
    'Enllaça-la des del peu i des de cada formulari.',
    'L\'AEPD té una eina gratuïta, "Facilita RGPD", per a petits negocis.',
  ],
  'privacy.cookie_policy': [
    'Crea una pàgina "Política de galetes" amb la llista de galetes, per a què serveix cadascuna, qui la instal·la i quant dura.',
    "Enllaça-la des del peu i des del bàner de galetes. Molts gestors (Cookiebot, Complianz) la generen i l'actualitzen sols.",
  ],
  'privacy.breaches': [
    "Si no ho vas fer en el seu moment, avisa l'AEPD i les persones afectades: el RGPD obliga a notificar les bretxes de dades personals.",
    'Obliga a canviar les contrasenyes dels comptes de clients i desa-les amb un algorisme segur (bcrypt o Argon2).',
    'Avisa els teus clients que mai no els demanaràs contrasenyes ni pagaments per correu, perquè desconfiïn del phishing.',
    'Revisa com es va produir i mantén actualitzats el gestor de continguts (WordPress, PrestaShop…) i els seus plugins.',
  ],
  'privacy.forms': [
    'Al costat del botó d\'enviar, afegeix la "informació bàsica" de protecció de dades: responsable, finalitat, drets i un enllaç a la política de privadesa.',
    "Les caselles per enviar publicitat o butlletins han d'estar desmarcades per defecte.",
    "Assegura't que el formulari s'envia per https.",
    "WordPress (Contact Form 7, WPForms, Elementor): tots permeten afegir una casella d'acceptació i un text legal.",
  ],
};
