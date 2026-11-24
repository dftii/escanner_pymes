import { messages } from '../i18n';

const pages = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Textos del check de cookies y RGPD en los tres idiomas. */
export const PRIVACY_MSG = messages({
  es: {
    disclaimer:
      'Los resultados sobre cookies y RGPD son orientativos: se basan en lo que se ve al cargar la web sin aceptar nada y no sustituyen el asesoramiento legal.',
    noProblems: 'Sin problemas.',
    kindTechnical: 'técnica',
    kindPreferences: 'de preferencias',
    kindAnalytics: 'de analítica',
    kindAdvertising: 'de publicidad',
    kindUnknown: 'desconocida',
    cookiesNote:
      'Solo vemos las cookies que envía el servidor; las que crean los scripts se revisan en el apartado de seguimiento.',
    cookiesFailTitle: 'Tu web instala cookies de seguimiento antes de pedir permiso',
    cookiesFailDetail: (list: string) => `Nada más entrar, sin aceptar nada, se instalan: ${list}.`,
    cookiesFailRisk:
      'Es una de las infracciones que más sanciona la AEPD: estas cookies requieren consentimiento previo.',
    cookiesUnknownTitle: 'Tu web instala cookies que no reconocemos',
    cookiesUnknownDetail: (list: string, note: string) => `Al entrar se instalan: ${list}. ${note}`,
    cookiesUnknownRisk:
      'Si no son técnicas (necesarias para que la web funcione), necesitan consentimiento previo.',
    cookiesTechTitle: 'Al entrar solo se instalan cookies técnicas',
    cookiesNoneTitle: 'Tu web no instala cookies desde el servidor al entrar',
    cookiesList: (list: string) => `Cookies: ${list}. `,
    cookiesOkRisk: 'Las cookies técnicas no necesitan consentimiento.',
    blockedNote: (list: string) => ` Bloqueados hasta que el usuario acepte: ${list}.`,
    trackersWaitTitle: 'Los scripts de seguimiento esperan al consentimiento',
    trackersNoneTitle: 'No hemos visto scripts de seguimiento al cargar la web',
    trackersOkDetail: (blocked: string) =>
      `Ningún script de analítica o publicidad se ejecuta antes de aceptar.${blocked}`,
    consentModeTitle: 'Usas Google Consent Mode con permisos denegados por defecto',
    consentModeDetail: (list: string, blocked: string) =>
      `Se cargan ${list}, pero empiezan sin guardar cookies hasta que el usuario acepte.${blocked}`,
    consentModeRisk:
      'Es una configuración aceptada si el banner actualiza el consentimiento correctamente; revísalo con tu proveedor.',
    trackersCmpTitle: 'Hay scripts de seguimiento que no parecen esperar al consentimiento',
    trackersCmpDetail: (list: string, blocked: string) =>
      `Tienes banner de cookies, pero en el HTML se cargan sin bloquear: ${list}.${blocked} Algunos gestores los bloquean al ejecutarse; compruébalo en el navegador.`,
    trackersCmpRisk:
      'Si se ejecutan antes de aceptar, instalan cookies sin permiso aunque haya banner.',
    trackersFailTitle: 'Tu web carga scripts de seguimiento sin pedir permiso',
    trackersFailDetail: (list: string, blocked: string) =>
      `Al entrar se ejecutan ${list}, que instalan cookies de analítica o publicidad, y no hay banner de cookies.${blocked}`,
    trackersFailRisk:
      'Es una infracción de la LSSI (art. 22.2) que la AEPD sanciona con frecuencia, también a pequeños negocios.',
    bannerKnownTitle: (name: string) => `Tienes un gestor de consentimiento de cookies (${name})`,
    bannerKnownDetail:
      'Recuerda que, según la AEPD, el botón de "Rechazar" debe estar en la primera capa y ser tan visible como el de "Aceptar".',
    bannerKnownRisk: 'Sin problemas, si está bien configurado.',
    bannerGenericTitle: 'Parece que tienes un aviso de cookies',
    bannerGenericDetail:
      'Hemos visto un aviso de cookies, pero no es un gestor conocido. Comprueba que permite rechazar en la primera capa y que bloquea las cookies hasta aceptar.',
    bannerGenericRisk:
      'Un simple aviso informativo ("al navegar aceptas…") no es un consentimiento válido.',
    bannerMissingTitle: 'Falta el banner de cookies',
    bannerMissingDetail:
      'Tu web usa cookies o scripts de analítica o publicidad y no pide consentimiento.',
    bannerMissingRisk:
      'La LSSI exige consentimiento previo para estas cookies; las multas pueden llegar a decenas de miles de euros.',
    bannerNotNeededTitle: 'No necesitas banner de cookies (por lo que vemos)',
    bannerNotNeededDetail:
      'No hemos visto cookies ni scripts que requieran consentimiento. Si añades analítica, vídeos o píxeles de publicidad, necesitarás uno.',
    legalLinked: (url: string) => `Enlazada desde la página de inicio: ${url}`,
    legalOkRisk: 'Sin problemas (revisa que su contenido esté actualizado).',
    noticeOk: 'Tienes aviso legal',
    noticeMissing: 'No encontramos el aviso legal',
    noticeDetail: 'No hay un enlace visible a un "Aviso legal" en la página de inicio.',
    noticeRisk:
      'La LSSI (art. 10) obliga a identificar al titular de la web: nombre o razón social, NIF, dirección y email.',
    privacyOk: 'Tienes política de privacidad',
    privacyMissing: 'No encontramos la política de privacidad',
    privacyDetail:
      'No hay un enlace visible a una "Política de privacidad" en la página de inicio.',
    privacyRisk:
      'Si tu web recoge cualquier dato (formulario, email, reservas), el RGPD (art. 13) obliga a informar de cómo se tratan.',
    cookiePolicyOk: 'Tienes política de cookies',
    cookiePolicyMissing: 'No encontramos la política de cookies',
    cookiePolicyFailDetail:
      'Tu web usa cookies que requieren consentimiento, pero no enlaza una "Política de cookies".',
    cookiePolicyFailRisk:
      'La LSSI (art. 22.2) obliga a informar de forma clara y completa sobre las cookies que se usan.',
    cookiePolicyInfoDetail:
      'No hay enlace a una "Política de cookies". Si solo usas cookies técnicas no es obligatoria, pero es recomendable.',
    cookiePolicyInfoRisk: 'Bajo, mientras no añadas cookies de analítica o publicidad.',
    formInsecure: 'envía los datos sin cifrar (http)',
    formNoPrivacy: 'no informa de la protección de datos junto al formulario',
    formPrechecked: 'tiene una casilla de consentimiento ya marcada',
    formsNoneTitle: 'No hemos visto formularios',
    formsNoneDetail: (n: number) =>
      `Hemos revisado ${pages(n, 'página', 'páginas')} sin encontrar formularios de contacto o registro.`,
    formsOkTitle: (n: number) =>
      n === 1
        ? 'El formulario informa sobre la protección de datos'
        : `Los ${n} formularios informan sobre la protección de datos`,
    formsOkDetail: 'Se envían cifrados y enlazan o resumen la información de privacidad.',
    formsInsecureTitle: 'Hay formularios que envían datos sin cifrar',
    formsGdprTitle: 'Hay formularios que no cumplen del todo con el RGPD',
    formsInsecureRisk: 'Los datos que escriben tus clientes pueden interceptarse.',
    formsGdprRisk:
      'El RGPD exige informar en el propio formulario (primera capa) y que el consentimiento sea una casilla sin marcar.',
  },
  ca: {
    disclaimer:
      "Els resultats sobre galetes i RGPD són orientatius: es basen en el que es veu en carregar el web sense acceptar res i no substitueixen l'assessorament legal.",
    noProblems: 'Cap problema.',
    kindTechnical: 'tècnica',
    kindPreferences: 'de preferències',
    kindAnalytics: "d'analítica",
    kindAdvertising: 'de publicitat',
    kindUnknown: 'desconeguda',
    cookiesNote:
      "Només veiem les galetes que envia el servidor; les que creen els scripts es revisen a l'apartat de seguiment.",
    cookiesFailTitle: 'El teu web instal·la galetes de seguiment abans de demanar permís',
    cookiesFailDetail: (list: string) => `Només entrar, sense acceptar res, s'instal·len: ${list}.`,
    cookiesFailRisk:
      "És una de les infraccions que més sanciona l'AEPD: aquestes galetes requereixen consentiment previ.",
    cookiesUnknownTitle: 'El teu web instal·la galetes que no reconeixem',
    cookiesUnknownDetail: (list: string, note: string) =>
      `En entrar s'instal·len: ${list}. ${note}`,
    cookiesUnknownRisk:
      'Si no són tècniques (necessàries perquè el web funcioni), necessiten consentiment previ.',
    cookiesTechTitle: "En entrar només s'instal·len galetes tècniques",
    cookiesNoneTitle: 'El teu web no instal·la galetes des del servidor en entrar',
    cookiesList: (list: string) => `Galetes: ${list}. `,
    cookiesOkRisk: 'Les galetes tècniques no necessiten consentiment.',
    blockedNote: (list: string) => ` Bloquejats fins que l'usuari accepti: ${list}.`,
    trackersWaitTitle: 'Els scripts de seguiment esperen el consentiment',
    trackersNoneTitle: 'No hem vist scripts de seguiment en carregar el web',
    trackersOkDetail: (blocked: string) =>
      `Cap script d'analítica o publicitat no s'executa abans d'acceptar.${blocked}`,
    consentModeTitle: 'Fas servir el Google Consent Mode amb permisos denegats per defecte',
    consentModeDetail: (list: string, blocked: string) =>
      `Es carreguen ${list}, però comencen sense desar galetes fins que l'usuari accepta.${blocked}`,
    consentModeRisk:
      'És una configuració acceptada si el bàner actualitza el consentiment correctament; revisa-ho amb el teu proveïdor.',
    trackersCmpTitle: 'Hi ha scripts de seguiment que no semblen esperar el consentiment',
    trackersCmpDetail: (list: string, blocked: string) =>
      `Tens bàner de galetes, però a l'HTML es carreguen sense bloquejar: ${list}.${blocked} Alguns gestors els bloquegen en executar-se; comprova-ho al navegador.`,
    trackersCmpRisk:
      "Si s'executen abans d'acceptar, instal·len galetes sense permís encara que hi hagi bàner.",
    trackersFailTitle: 'El teu web carrega scripts de seguiment sense demanar permís',
    trackersFailDetail: (list: string, blocked: string) =>
      `En entrar s'executen ${list}, que instal·len galetes d'analítica o publicitat, i no hi ha bàner de galetes.${blocked}`,
    trackersFailRisk:
      "És una infracció de la LSSI (art. 22.2) que l'AEPD sanciona sovint, també a petits negocis.",
    bannerKnownTitle: (name: string) => `Tens un gestor de consentiment de galetes (${name})`,
    bannerKnownDetail:
      'Recorda que, segons l\'AEPD, el botó de "Rebutjar" ha de ser a la primera capa i tan visible com el d\'"Acceptar".',
    bannerKnownRisk: 'Cap problema, si està ben configurat.',
    bannerGenericTitle: 'Sembla que tens un avís de galetes',
    bannerGenericDetail:
      "Hem vist un avís de galetes, però no és un gestor conegut. Comprova que permet rebutjar a la primera capa i que bloqueja les galetes fins que s'accepten.",
    bannerGenericRisk:
      'Un simple avís informatiu ("si navegues acceptes…") no és un consentiment vàlid.',
    bannerMissingTitle: 'Falta el bàner de galetes',
    bannerMissingDetail:
      "El teu web fa servir galetes o scripts d'analítica o publicitat i no demana consentiment.",
    bannerMissingRisk:
      "La LSSI exigeix consentiment previ per a aquestes galetes; les multes poden arribar a desenes de milers d'euros.",
    bannerNotNeededTitle: 'No necessites bàner de galetes (pel que veiem)',
    bannerNotNeededDetail:
      'No hem vist galetes ni scripts que requereixin consentiment. Si hi afegeixes analítica, vídeos o píxels de publicitat, en necessitaràs un.',
    legalLinked: (url: string) => `Enllaçada des de la pàgina d'inici: ${url}`,
    legalOkRisk: 'Cap problema (revisa que el contingut estigui actualitzat).',
    noticeOk: 'Tens avís legal',
    noticeMissing: "No trobem l'avís legal",
    noticeDetail: 'No hi ha cap enllaç visible a un "Avís legal" a la pàgina d\'inici.',
    noticeRisk:
      'La LSSI (art. 10) obliga a identificar el titular del web: nom o raó social, NIF, adreça i correu.',
    privacyOk: 'Tens política de privadesa',
    privacyMissing: 'No trobem la política de privadesa',
    privacyDetail:
      'No hi ha cap enllaç visible a una "Política de privadesa" a la pàgina d\'inici.',
    privacyRisk:
      'Si el teu web recull qualsevol dada (formulari, correu, reserves), el RGPD (art. 13) obliga a informar de com es tracten.',
    cookiePolicyOk: 'Tens política de galetes',
    cookiePolicyMissing: 'No trobem la política de galetes',
    cookiePolicyFailDetail:
      'El teu web fa servir galetes que requereixen consentiment, però no enllaça cap "Política de galetes".',
    cookiePolicyFailRisk:
      "La LSSI (art. 22.2) obliga a informar de manera clara i completa sobre les galetes que s'utilitzen.",
    cookiePolicyInfoDetail:
      'No hi ha cap enllaç a una "Política de galetes". Si només fas servir galetes tècniques no és obligatòria, però és recomanable.',
    cookiePolicyInfoRisk: "Baix, mentre no hi afegeixis galetes d'analítica o publicitat.",
    formInsecure: 'envia les dades sense xifrar (http)',
    formNoPrivacy: 'no informa de la protecció de dades al costat del formulari',
    formPrechecked: 'té una casella de consentiment ja marcada',
    formsNoneTitle: 'No hem vist formularis',
    formsNoneDetail: (n: number) =>
      `Hem revisat ${pages(n, 'pàgina', 'pàgines')} sense trobar formularis de contacte o registre.`,
    formsOkTitle: (n: number) =>
      n === 1
        ? 'El formulari informa sobre la protecció de dades'
        : `Els ${n} formularis informen sobre la protecció de dades`,
    formsOkDetail: "S'envien xifrats i enllacen o resumeixen la informació de privadesa.",
    formsInsecureTitle: 'Hi ha formularis que envien dades sense xifrar',
    formsGdprTitle: 'Hi ha formularis que no compleixen del tot el RGPD',
    formsInsecureRisk: 'Les dades que escriuen els teus clients es poden interceptar.',
    formsGdprRisk:
      'El RGPD exigeix informar al mateix formulari (primera capa) i que el consentiment sigui una casella sense marcar.',
  },
  en: {
    disclaimer:
      'The cookie and GDPR results are a guide only: they are based on what can be seen when loading the website without accepting anything, and they are not legal advice.',
    noProblems: 'No problems.',
    kindTechnical: 'technical',
    kindPreferences: 'preferences',
    kindAnalytics: 'analytics',
    kindAdvertising: 'advertising',
    kindUnknown: 'unknown',
    cookiesNote:
      'We only see the cookies sent by the server; those created by scripts are covered in the tracking section.',
    cookiesFailTitle: 'Your website sets tracking cookies before asking for permission',
    cookiesFailDetail: (list: string) =>
      `As soon as someone arrives, without accepting anything, these are set: ${list}.`,
    cookiesFailRisk:
      'It is one of the most heavily fined breaches in Spain (AEPD): these cookies require prior consent.',
    cookiesUnknownTitle: 'Your website sets cookies we do not recognise',
    cookiesUnknownDetail: (list: string, note: string) =>
      `On arrival these are set: ${list}. ${note}`,
    cookiesUnknownRisk:
      'If they are not technical (needed for the website to work), they need prior consent.',
    cookiesTechTitle: 'Only technical cookies are set on arrival',
    cookiesNoneTitle: 'Your website sets no server cookies on arrival',
    cookiesList: (list: string) => `Cookies: ${list}. `,
    cookiesOkRisk: 'Technical cookies do not need consent.',
    blockedNote: (list: string) => ` Blocked until the user accepts: ${list}.`,
    trackersWaitTitle: 'Tracking scripts wait for consent',
    trackersNoneTitle: 'We saw no tracking scripts when loading the website',
    trackersOkDetail: (blocked: string) =>
      `No analytics or advertising script runs before the user accepts.${blocked}`,
    consentModeTitle: 'You use Google Consent Mode with permissions denied by default',
    consentModeDetail: (list: string, blocked: string) =>
      `${list} load, but start without storing cookies until the user accepts.${blocked}`,
    consentModeRisk:
      'This setup is accepted as long as the banner updates consent correctly; check it with your provider.',
    trackersCmpTitle: 'Some tracking scripts do not seem to wait for consent',
    trackersCmpDetail: (list: string, blocked: string) =>
      `You have a cookie banner, but these load unblocked in the HTML: ${list}.${blocked} Some consent managers block them when they run; check it in the browser.`,
    trackersCmpRisk:
      'If they run before the user accepts, they set cookies without permission even with a banner.',
    trackersFailTitle: 'Your website loads tracking scripts without asking for permission',
    trackersFailDetail: (list: string, blocked: string) =>
      `On arrival ${list} run, setting analytics or advertising cookies, and there is no cookie banner.${blocked}`,
    trackersFailRisk:
      'It breaches Spanish law (LSSI art. 22.2), which the AEPD fines frequently, small businesses included.',
    bannerKnownTitle: (name: string) => `You have a cookie consent manager (${name})`,
    bannerKnownDetail:
      'Remember that, according to the AEPD, the "Reject" button must be on the first layer and as visible as "Accept".',
    bannerKnownRisk: 'No problems, if it is configured correctly.',
    bannerGenericTitle: 'You seem to have a cookie notice',
    bannerGenericDetail:
      'We saw a cookie notice, but not from a known consent manager. Check it lets people reject on the first layer and blocks cookies until they accept.',
    bannerGenericRisk:
      'A simple informational notice ("by browsing you accept…") is not valid consent.',
    bannerMissingTitle: 'The cookie banner is missing',
    bannerMissingDetail:
      'Your website uses analytics or advertising cookies or scripts and does not ask for consent.',
    bannerMissingRisk:
      'Spanish law (LSSI) requires prior consent for these cookies; fines can reach tens of thousands of euros.',
    bannerNotNeededTitle: 'You do not need a cookie banner (as far as we can see)',
    bannerNotNeededDetail:
      'We saw no cookies or scripts that require consent. If you add analytics, videos or advertising pixels, you will need one.',
    legalLinked: (url: string) => `Linked from the home page: ${url}`,
    legalOkRisk: 'No problems (check its content is up to date).',
    noticeOk: 'You have a legal notice',
    noticeMissing: 'We could not find the legal notice',
    noticeDetail: 'There is no visible link to a "Legal notice" on the home page.',
    noticeRisk:
      'Spanish law (LSSI art. 10) requires identifying the website owner: name or company name, tax ID, address and email.',
    privacyOk: 'You have a privacy policy',
    privacyMissing: 'We could not find the privacy policy',
    privacyDetail: 'There is no visible link to a "Privacy policy" on the home page.',
    privacyRisk:
      'If your website collects any data (form, email, bookings), the GDPR (art. 13) requires explaining how it is handled.',
    cookiePolicyOk: 'You have a cookie policy',
    cookiePolicyMissing: 'We could not find the cookie policy',
    cookiePolicyFailDetail:
      'Your website uses cookies that require consent, but does not link to a "Cookie policy".',
    cookiePolicyFailRisk:
      'Spanish law (LSSI art. 22.2) requires clear and complete information about the cookies used.',
    cookiePolicyInfoDetail:
      'There is no link to a "Cookie policy". If you only use technical cookies it is not mandatory, but it is recommended.',
    cookiePolicyInfoRisk: 'Low, as long as you do not add analytics or advertising cookies.',
    formInsecure: 'sends the data unencrypted (http)',
    formNoPrivacy: 'does not give data protection information next to the form',
    formPrechecked: 'has a consent checkbox already ticked',
    formsNoneTitle: 'We did not see any forms',
    formsNoneDetail: (n: number) =>
      `We checked ${pages(n, 'page', 'pages')} without finding contact or sign-up forms.`,
    formsOkTitle: (n: number) =>
      n === 1
        ? 'The form gives data protection information'
        : `The ${n} forms give data protection information`,
    formsOkDetail: 'They are sent encrypted and link to or summarise the privacy information.',
    formsInsecureTitle: 'Some forms send data unencrypted',
    formsGdprTitle: 'Some forms do not fully comply with the GDPR',
    formsInsecureRisk: 'The data your customers type in can be intercepted.',
    formsGdprRisk:
      'The GDPR requires information on the form itself (first layer) and consent given through an unticked checkbox.',
  },
});

/** Etiquetas genéricas de los catálogos de cookies y scripts (los nombres de marca no se traducen). */
const LABELS: Record<string, { ca: string; en: string }> = {
  'Analítica de terceros': { ca: 'Analítica de tercers', en: 'Third-party analytics' },
  'Balanceador / CDN': { ca: 'Balancejador / CDN', en: 'Load balancer / CDN' },
  'Gestor de consentimiento': { ca: 'Gestor de consentiment', en: 'Consent manager' },
  Idioma: { ca: 'Idioma', en: 'Language' },
  'Plataforma web': { ca: 'Plataforma web', en: 'Website platform' },
  'Sesión / seguridad': { ca: 'Sessió / seguretat', en: 'Session / security' },
  'Sesión del servidor': { ca: 'Sessió del servidor', en: 'Server session' },
  'Vídeo de YouTube incrustado': { ca: 'Vídeo de YouTube incrustat', en: 'Embedded YouTube video' },
};

export function localizeLabel(label: string, locale: 'es' | 'ca' | 'en'): string {
  return locale === 'es' ? label : (LABELS[label]?.[locale] ?? label);
}
