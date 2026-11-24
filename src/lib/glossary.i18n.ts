import type { GlossaryEntry } from './glossary';

/** Glossari en català (mateixos `id` que el castellà). */
export const GLOSSARY_CA: readonly GlossaryEntry[] = [
  {
    id: 'ssl',
    term: 'SSL / TLS',
    match: ['SSL', 'TLS'],
    definition:
      'El xifratge que protegeix la connexió entre el navegador i el teu web. És el que fa que aparegui el cadenat i que l’adreça comenci per https.',
  },
  {
    id: 'certificado',
    term: 'Certificat',
    match: ['certificat', 'certificats'],
    ci: true,
    definition:
      'Document digital que demostra que el web és qui diu ser i permet xifrar la connexió. Caduca i cal renovar-lo (molts allotjaments ho fan sols).',
  },
  {
    id: 'https',
    term: 'HTTPS',
    match: ['HTTPS', 'https'],
    definition:
      'La versió xifrada del web. Sense ella, qualsevol a la mateixa xarxa wifi podria veure o canviar el que s’envia.',
  },
  {
    id: 'hsts',
    term: 'HSTS',
    match: ['HSTS'],
    definition:
      'Una ordre que el teu web dona al navegador: "connecta’t sempre a mi de manera segura". Evita que algú forci una connexió sense xifrar.',
  },
  {
    id: 'csp',
    term: 'CSP',
    match: ['CSP'],
    definition:
      'Política de seguretat de contingut: una llista de quins scripts i imatges pot carregar el teu web. Si algú aconsegueix colar codi maliciós, el navegador el bloqueja.',
  },
  {
    id: 'clickjacking',
    term: 'Clickjacking',
    match: ['clickjacking', 'incrustar', 'incrustat'],
    ci: true,
    definition:
      'Parany en què un altre web mostra el teu amagat dins del seu perquè l’usuari faci clic sense saber-ho. S’evita prohibint que t’incrustin.',
  },
  {
    id: 'cabeceras',
    term: 'Capçaleres de seguretat',
    match: ['capçaleres', 'capçalera'],
    ci: true,
    definition:
      'Instruccions invisibles que el teu web envia al navegador amb cada pàgina per activar proteccions. Es configuren al servidor o a l’allotjament.',
  },
  {
    id: 'dns',
    term: 'DNS',
    match: ['DNS'],
    definition:
      'L’"agenda" d’Internet: tradueix el teu domini a l’adreça del servidor i guarda dades com qui envia el teu correu. Es gestiona al tauler del teu proveïdor de domini.',
  },
  {
    id: 'txt',
    term: 'Registre TXT',
    match: ['TXT'],
    definition: 'Un tipus de registre DNS que guarda text. SPF, DKIM i DMARC es publiquen així.',
  },
  {
    id: 'mx',
    term: 'MX',
    match: ['MX'],
    definition:
      'Registre DNS que indica quins servidors reben el correu del teu domini (Google, Microsoft, el teu allotjament…).',
  },
  {
    id: 'spf',
    term: 'SPF',
    match: ['SPF'],
    definition:
      'Llista pública dels servidors que poden enviar correu en nom del teu domini. La resta, en principi, són falsos.',
  },
  {
    id: 'dkim',
    term: 'DKIM',
    match: ['DKIM'],
    definition:
      'Signatura digital que el teu proveïdor de correu afegeix a cada missatge. Demostra que de debò va sortir del teu domini i que ningú no l’ha canviat.',
  },
  {
    id: 'dmarc',
    term: 'DMARC',
    match: ['DMARC'],
    definition:
      'La regla que diu a Gmail, Outlook i companyia què han de fer amb els correus que fallen SPF i DKIM: res (none), enviar-los a correu brossa (quarantine) o rebutjar-los (reject).',
  },
  {
    id: 'phishing',
    term: 'Phishing',
    match: ['phishing'],
    ci: true,
    definition:
      'Engany per correu o missatge que es fa passar per algú de confiança (el teu negoci, un banc) per robar dades, contrasenyes o diners.',
  },
  {
    id: 'cookie',
    term: 'Galeta (cookie)',
    match: ['galeta', 'galetes', 'cookie', 'cookies'],
    ci: true,
    definition:
      'Petit fitxer que el web desa al navegador. Les tècniques (cistella, sessió) no necessiten permís; les d’analítica i publicitat, sí.',
  },
  {
    id: 'cmp',
    term: 'Gestor de consentiment (CMP)',
    match: ['CMP', 'gestor de consentiment'],
    definition:
      'L’eina del bàner de galetes: pregunta a l’usuari i bloqueja les galetes i els scripts de seguiment fins que accepta.',
  },
  {
    id: 'rgpd',
    term: 'RGPD',
    match: ['RGPD'],
    definition:
      'Reglament General de Protecció de Dades de la UE: obliga a informar de quines dades personals tractes, per a què i amb quina base legal.',
  },
  {
    id: 'lssi',
    term: 'LSSI',
    match: ['LSSI', 'LSSI-CE'],
    definition:
      'Llei espanyola de serveis de la societat de la informació: obliga, entre altres coses, a tenir avís legal i a demanar permís per a les galetes que no són tècniques.',
  },
  {
    id: 'aepd',
    term: 'AEPD',
    match: ['AEPD'],
    definition:
      'Agència Espanyola de Protecció de Dades: l’autoritat que vigila el RGPD i les galetes a Espanya i que posa les multes.',
  },
  {
    id: 'cms',
    term: 'Gestor de continguts (CMS)',
    match: ['WordPress', 'Joomla', 'Drupal', 'PrestaShop'],
    definition:
      'El programa amb què es fa i s’edita el web. Cal actualitzar-lo, juntament amb els plugins i el tema, perquè els errors de les versions antigues són públics.',
  },
  {
    id: 'plugin',
    term: 'Plugin',
    match: ['plugin', 'plugins'],
    ci: true,
    definition:
      'Complement que afegeix funcions a WordPress o a un altre gestor. És la via d’atac més habitual quan no s’actualitza.',
  },
  {
    id: 'contenido-mixto',
    term: 'Contingut mixt',
    match: ['contingut mixt'],
    ci: true,
    definition:
      'Una pàgina segura (https) que carrega algun fitxer per la via sense xifrar (http). El navegador el bloqueja o treu el cadenat.',
  },
  {
    id: 'hibp',
    term: 'Have I Been Pwned',
    match: ['Have I Been Pwned'],
    definition:
      'Servei públic i gratuït que recull les filtracions de dades conegudes perquè tothom pugui comprovar si l’afecten.',
  },
];

/** Glossary in English (same `id`s as the Spanish one). */
export const GLOSSARY_EN: readonly GlossaryEntry[] = [
  {
    id: 'ssl',
    term: 'SSL / TLS',
    match: ['SSL', 'TLS'],
    definition:
      'The encryption that protects the connection between the browser and your website. It is what shows the padlock and makes the address start with https.',
  },
  {
    id: 'certificado',
    term: 'Certificate',
    match: ['certificate', 'certificates'],
    ci: true,
    definition:
      'A digital document proving the website is who it claims to be and allowing the connection to be encrypted. It expires and must be renewed (many hosts do it automatically).',
  },
  {
    id: 'https',
    term: 'HTTPS',
    match: ['HTTPS', 'https'],
    definition:
      'The encrypted version of the website. Without it, anyone on the same wifi could see or change what is sent.',
  },
  {
    id: 'hsts',
    term: 'HSTS',
    match: ['HSTS'],
    definition:
      'An instruction your website gives the browser: "always connect to me securely". It stops anyone from forcing an unencrypted connection.',
  },
  {
    id: 'csp',
    term: 'CSP',
    match: ['CSP'],
    definition:
      'Content Security Policy: a list of which scripts and images your website may load. If someone manages to sneak in malicious code, the browser blocks it.',
  },
  {
    id: 'clickjacking',
    term: 'Clickjacking',
    match: ['clickjacking', 'embedded'],
    ci: true,
    definition:
      'A trick where another website shows yours hidden inside its own so users click without realising. It is prevented by forbidding embedding.',
  },
  {
    id: 'cabeceras',
    term: 'Security headers',
    match: ['headers', 'header'],
    ci: true,
    definition:
      'Invisible instructions your website sends the browser with every page to turn on protections. They are set on the server or in the hosting panel.',
  },
  {
    id: 'dns',
    term: 'DNS',
    match: ['DNS'],
    definition:
      'The internet’s "address book": it translates your domain into the server’s address and stores data such as who sends your email. It is managed in your domain provider’s dashboard.',
  },
  {
    id: 'txt',
    term: 'TXT record',
    match: ['TXT'],
    definition:
      'A type of DNS record that stores text. SPF, DKIM and DMARC are published this way.',
  },
  {
    id: 'mx',
    term: 'MX',
    match: ['MX'],
    definition:
      'A DNS record stating which servers receive your domain’s email (Google, Microsoft, your host…).',
  },
  {
    id: 'spf',
    term: 'SPF',
    match: ['SPF'],
    definition:
      'A public list of the servers allowed to send email on behalf of your domain. Anything else is, in principle, fake.',
  },
  {
    id: 'dkim',
    term: 'DKIM',
    match: ['DKIM'],
    definition:
      'A digital signature your email provider adds to every message. It proves the message really came from your domain and that nobody changed it.',
  },
  {
    id: 'dmarc',
    term: 'DMARC',
    match: ['DMARC'],
    definition:
      'The rule telling Gmail, Outlook and others what to do with emails that fail SPF and DKIM: nothing (none), send them to spam (quarantine) or reject them (reject).',
  },
  {
    id: 'phishing',
    term: 'Phishing',
    match: ['phishing'],
    ci: true,
    definition:
      'A scam by email or message pretending to be someone trustworthy (your business, a bank) to steal data, passwords or money.',
  },
  {
    id: 'cookie',
    term: 'Cookie',
    match: ['cookie', 'cookies'],
    ci: true,
    definition:
      'A small file the website stores in the browser. Technical ones (basket, session) need no permission; analytics and advertising ones do.',
  },
  {
    id: 'cmp',
    term: 'Consent manager (CMP)',
    match: ['CMP', 'consent manager'],
    definition:
      'The cookie banner tool: it asks the user and blocks tracking cookies and scripts until they accept.',
  },
  {
    id: 'rgpd',
    term: 'GDPR',
    match: ['GDPR'],
    definition:
      'The EU General Data Protection Regulation: it requires you to explain what personal data you handle, why and on what legal basis.',
  },
  {
    id: 'lssi',
    term: 'LSSI',
    match: ['LSSI', 'LSSI-CE'],
    definition:
      'Spain’s information society services law: among other things, it requires a legal notice and asking permission for non-technical cookies.',
  },
  {
    id: 'aepd',
    term: 'AEPD',
    match: ['AEPD'],
    definition:
      'The Spanish Data Protection Agency: the authority that enforces the GDPR and cookie rules in Spain and issues fines.',
  },
  {
    id: 'cms',
    term: 'Content management system (CMS)',
    match: ['WordPress', 'Joomla', 'Drupal', 'PrestaShop'],
    definition:
      'The software used to build and edit the website. It must be kept up to date, along with its plugins and theme, because the flaws in old versions are public.',
  },
  {
    id: 'plugin',
    term: 'Plugin',
    match: ['plugin', 'plugins'],
    ci: true,
    definition:
      'An add-on that gives WordPress or another CMS extra features. It is the most common way in for attackers when it is not updated.',
  },
  {
    id: 'contenido-mixto',
    term: 'Mixed content',
    match: ['mixed content'],
    ci: true,
    definition:
      'A secure page (https) that loads some file over the unencrypted route (http). The browser blocks it or removes the padlock.',
  },
  {
    id: 'hibp',
    term: 'Have I Been Pwned',
    match: ['Have I Been Pwned'],
    definition:
      'A free public service that collects known data breaches so anyone can check whether they are affected.',
  },
];
