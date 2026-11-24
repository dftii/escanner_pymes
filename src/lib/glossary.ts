import { GLOSSARY_CA, GLOSSARY_EN } from './glossary.i18n';
import { LOCALE_TAGS, type Locale } from './i18n';

/**
 * Glosario en lenguaje llano. Cada término tiene las formas en que aparece en
 * los textos del informe (`match`) y una explicación de una o dos frases.
 */
export type GlossaryEntry = {
  id: string;
  term: string;
  /** Formas que se reconocen en el texto (sensibles a mayúsculas salvo `ci`). */
  match: string[];
  /** Reconocer sin distinguir mayúsculas (palabras normales, no siglas). */
  ci?: boolean;
  definition: string;
};

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'ssl',
    term: 'SSL / TLS',
    match: ['SSL', 'TLS'],
    definition:
      'El cifrado que protege la conexión entre el navegador y tu web. Es lo que hace que aparezca el candado y que la dirección empiece por https.',
  },
  {
    id: 'certificado',
    term: 'Certificado',
    match: ['certificado', 'certificados'],
    ci: true,
    definition:
      'Documento digital que demuestra que la web es quien dice ser y permite cifrar la conexión. Caduca y hay que renovarlo (muchos hostings lo hacen solos).',
  },
  {
    id: 'https',
    term: 'HTTPS',
    match: ['HTTPS', 'https'],
    definition:
      'La versión cifrada de la web. Sin ella, cualquiera en la misma red wifi podría ver o cambiar lo que se envía.',
  },
  {
    id: 'hsts',
    term: 'HSTS',
    match: ['HSTS'],
    definition:
      'Una orden que tu web da al navegador: "conéctate siempre a mí de forma segura". Evita que alguien fuerce una conexión sin cifrar.',
  },
  {
    id: 'csp',
    term: 'CSP',
    match: ['CSP'],
    definition:
      'Política de seguridad de contenido: una lista de qué scripts e imágenes puede cargar tu web. Si alguien consigue colar código malicioso, el navegador lo bloquea.',
  },
  {
    id: 'clickjacking',
    term: 'Clickjacking',
    match: ['clickjacking', 'incrustar', 'incrustación'],
    ci: true,
    definition:
      'Trampa en la que otra web muestra la tuya escondida dentro de la suya para que el usuario haga clic sin saberlo. Se evita prohibiendo que te incrusten.',
  },
  {
    id: 'cabeceras',
    term: 'Cabeceras de seguridad',
    match: ['cabeceras', 'cabecera'],
    ci: true,
    definition:
      'Instrucciones invisibles que tu web envía al navegador junto a cada página para activar protecciones. Se configuran en el servidor o en el hosting.',
  },
  {
    id: 'dns',
    term: 'DNS',
    match: ['DNS'],
    definition:
      'La "agenda" de Internet: traduce tu dominio a la dirección del servidor y guarda datos como quién envía tu correo. Se gestiona en el panel de tu proveedor de dominio.',
  },
  {
    id: 'txt',
    term: 'Registro TXT',
    match: ['TXT'],
    definition: 'Un tipo de registro DNS que guarda texto. SPF, DKIM y DMARC se publican así.',
  },
  {
    id: 'mx',
    term: 'MX',
    match: ['MX'],
    definition:
      'Registro DNS que indica qué servidores reciben el correo de tu dominio (Google, Microsoft, tu hosting…).',
  },
  {
    id: 'spf',
    term: 'SPF',
    match: ['SPF'],
    definition:
      'Lista pública de los servidores que pueden enviar correo en nombre de tu dominio. El resto, en principio, son falsos.',
  },
  {
    id: 'dkim',
    term: 'DKIM',
    match: ['DKIM'],
    definition:
      'Firma digital que tu proveedor de correo añade a cada email. Demuestra que el mensaje salió de verdad de tu dominio y que nadie lo cambió.',
  },
  {
    id: 'dmarc',
    term: 'DMARC',
    match: ['DMARC'],
    definition:
      'La regla que dice a Gmail, Outlook y compañía qué hacer con los correos que fallan SPF y DKIM: nada (none), mandarlos a spam (quarantine) o rechazarlos (reject).',
  },
  {
    id: 'phishing',
    term: 'Phishing',
    match: ['phishing'],
    ci: true,
    definition:
      'Engaño por email o mensaje que se hace pasar por alguien de confianza (tu negocio, un banco) para robar datos, contraseñas o dinero.',
  },
  {
    id: 'cookie',
    term: 'Cookie',
    match: ['cookie', 'cookies'],
    ci: true,
    definition:
      'Pequeño archivo que la web guarda en el navegador. Las técnicas (carrito, sesión) no necesitan permiso; las de analítica y publicidad, sí.',
  },
  {
    id: 'cmp',
    term: 'Gestor de consentimiento (CMP)',
    match: ['CMP', 'gestor de consentimiento'],
    definition:
      'La herramienta del banner de cookies: pregunta al usuario y bloquea las cookies y scripts de seguimiento hasta que acepta.',
  },
  {
    id: 'rgpd',
    term: 'RGPD',
    match: ['RGPD'],
    definition:
      'Reglamento General de Protección de Datos de la UE: obliga a informar de qué datos personales tratas, para qué y con qué base legal.',
  },
  {
    id: 'lssi',
    term: 'LSSI',
    match: ['LSSI', 'LSSI-CE'],
    definition:
      'Ley española de servicios de la sociedad de la información: obliga, entre otras cosas, al aviso legal y a pedir permiso para las cookies que no son técnicas.',
  },
  {
    id: 'aepd',
    term: 'AEPD',
    match: ['AEPD'],
    definition:
      'Agencia Española de Protección de Datos: la autoridad que vigila el RGPD y las cookies en España y que pone las multas.',
  },
  {
    id: 'cms',
    term: 'Gestor de contenidos (CMS)',
    match: ['WordPress', 'Joomla', 'Drupal', 'PrestaShop'],
    definition:
      'El programa con el que se hace y se edita la web. Hay que actualizarlo, junto con sus plugins y su tema, porque los fallos de las versiones antiguas son públicos.',
  },
  {
    id: 'plugin',
    term: 'Plugin',
    match: ['plugin', 'plugins'],
    ci: true,
    definition:
      'Complemento que añade funciones a WordPress u otro gestor. Es la vía de ataque más habitual cuando no se actualiza.',
  },
  {
    id: 'contenido-mixto',
    term: 'Contenido mixto',
    match: ['contenido mixto'],
    ci: true,
    definition:
      'Una página segura (https) que carga algún archivo por la vía sin cifrar (http). El navegador lo bloquea o quita el candado.',
  },
  {
    id: 'hibp',
    term: 'Have I Been Pwned',
    match: ['Have I Been Pwned'],
    definition:
      'Servicio público y gratuito que recopila las filtraciones de datos conocidas para que cualquiera pueda comprobar si le afectan.',
  },
];

export type TextPart = string | { text: string; entry: GlossaryEntry };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const BY_LOCALE: Record<Locale, readonly GlossaryEntry[]> = {
  es: GLOSSARY,
  ca: GLOSSARY_CA,
  en: GLOSSARY_EN,
};

/** Glosario del idioma, ordenado alfabéticamente. */
export const glossaryFor = (locale: Locale): readonly GlossaryEntry[] =>
  [...BY_LOCALE[locale]].sort((a, b) => a.term.localeCompare(b.term, LOCALE_TAGS[locale]));

type Matcher = { pattern: RegExp; byForm: Map<string, GlossaryEntry> };
const matchers = new Map<Locale, Matcher>();

function matcherFor(locale: Locale): Matcher {
  let m = matchers.get(locale);
  if (!m) {
    // Formas más largas primero ("LSSI-CE" antes que "LSSI").
    const forms = BY_LOCALE[locale]
      .flatMap((entry) => entry.match.map((form) => ({ form, entry })))
      .sort((a, b) => b.form.length - a.form.length);
    m = {
      byForm: new Map(forms.map(({ form, entry }) => [form.toLowerCase(), entry])),
      pattern: new RegExp(
        `(?<![\\p{L}\\p{N}_@./-])(${forms.map(({ form }) => escape(form)).join('|')})(?![\\p{L}\\p{N}_])`,
        'giu',
      ),
    };
    matchers.set(locale, m);
  }
  return m;
}

/**
 * Parte un texto en trozos de texto normal y términos del glosario. Solo
 * marca la primera aparición de cada término, para no llenar el texto de
 * subrayados; `seen` permite compartirlo entre varios párrafos.
 */
export function splitGlossary(
  text: string,
  seen: Set<string> = new Set(),
  locale: Locale = 'es',
): TextPart[] {
  const { pattern, byForm } = matcherFor(locale);
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const found = m[1]!;
    const entry = byForm.get(found.toLowerCase());
    if (!entry || seen.has(entry.id)) continue;
    // Las siglas solo cuentan en mayúsculas ("csp" o "mx" sueltos no).
    const exact = entry.match.includes(found);
    if (!entry.ci && !exact) continue;
    seen.add(entry.id);
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ text: found, entry });
    last = m.index + found.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
