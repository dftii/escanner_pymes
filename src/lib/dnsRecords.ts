import { messages, type Locale } from './i18n';

export const MSG = messages({
  es: {
    senders:
      'Si envías correo desde otros servicios (Mailchimp, Brevo, la tienda online, el formulario de la web), añade su "include:" antes del final; cada uno lo indica en su ayuda.',
    spfNoMail:
      'Tu dominio no tiene correo: así declaras que nadie puede enviar emails en su nombre. Si en realidad sí envías correo con él, no lo uses.',
    spfProvider: (p: string, senders: string) => `Autoriza a ${p} a enviar tu correo. ${senders}`,
    spfMx: (senders: string) =>
      `Autoriza a tus servidores de correo (MX). Si tu proveedor te da un "include:", úsalo en lugar de "mx". ${senders}`,
    spfMerge:
      'Une tus registros SPF en este único registro y borra los demás: solo puede haber uno.',
    spfReplace:
      'Sustituye tu registro SPF actual por este: mantiene los mismos servicios y corrige el final.',
    dmarcRecommended: 'Recomendado',
    dmarcNoMail:
      'Tu dominio no envía correo, así que puedes rechazar directamente cualquier email que se haga pasar por él.',
    dmarcMailbox: (d: string) =>
      ` Crea el buzón dmarc@${d} (o cambia la dirección) para recibir los informes.`,
    step1: 'Paso 1: observar (2 a 4 semanas)',
    step1Note: (mailbox: string) =>
      `No bloquea nada todavía: recibes informes de quién envía correo con tu dominio, para comprobar que tus envíos legítimos pasan SPF o DKIM.${mailbox}`,
    step2: 'Paso 2: a spam',
    step2Note:
      'Cuando los informes muestren que tu correo legítimo pasa, los emails falsos irán a la carpeta de spam.',
    step3: 'Paso 3: rechazar',
    step3Note: 'La protección completa: los emails falsos ni siquiera llegan.',
  },
  ca: {
    senders:
      'Si envies correu des d\'altres serveis (Mailchimp, Brevo, la botiga en línia, el formulari del web), afegeix-ne l\'"include:" abans del final; cadascun ho indica a la seva ajuda.',
    spfNoMail:
      'El teu domini no té correu: així declares que ningú no pot enviar correus en el seu nom. Si en realitat sí que hi envies correu, no el facis servir.',
    spfProvider: (p: string, senders: string) =>
      `Autoritza ${p} a enviar el teu correu. ${senders}`,
    spfMx: (senders: string) =>
      `Autoritza els teus servidors de correu (MX). Si el teu proveïdor et dona un "include:", fes-lo servir en lloc de "mx". ${senders}`,
    spfMerge:
      "Uneix els teus registres SPF en aquest únic registre i esborra la resta: només n'hi pot haver un.",
    spfReplace:
      'Substitueix el teu registre SPF actual per aquest: manté els mateixos serveis i en corregeix el final.',
    dmarcRecommended: 'Recomanat',
    dmarcNoMail:
      'El teu domini no envia correu, així que pots rebutjar directament qualsevol correu que es faci passar per ell.',
    dmarcMailbox: (d: string) =>
      ` Crea la bústia dmarc@${d} (o canvia l'adreça) per rebre els informes.`,
    step1: 'Pas 1: observar (de 2 a 4 setmanes)',
    step1Note: (mailbox: string) =>
      `Encara no bloqueja res: reps informes de qui envia correu amb el teu domini, per comprovar que els teus enviaments legítims passen SPF o DKIM.${mailbox}`,
    step2: 'Pas 2: a correu brossa',
    step2Note:
      'Quan els informes mostrin que el teu correu legítim passa, els correus falsos aniran a la carpeta de correu brossa.',
    step3: 'Pas 3: rebutjar',
    step3Note: 'La protecció completa: els correus falsos ni tan sols arriben.',
  },
  en: {
    senders:
      'If you send email from other services (Mailchimp, Brevo, your online shop, the website form), add their "include:" before the end; each one explains it in its help pages.',
    spfNoMail:
      'Your domain has no email: this declares that nobody may send email on its behalf. If you actually do send email from it, do not use this.',
    spfProvider: (p: string, senders: string) => `Authorises ${p} to send your email. ${senders}`,
    spfMx: (senders: string) =>
      `Authorises your mail servers (MX). If your provider gives you an "include:", use it instead of "mx". ${senders}`,
    spfMerge:
      'Merge your SPF records into this single record and delete the rest: there can only be one.',
    spfReplace:
      'Replace your current SPF record with this one: it keeps the same services and fixes the ending.',
    dmarcRecommended: 'Recommended',
    dmarcNoMail:
      'Your domain does not send email, so you can reject outright any email that pretends to come from it.',
    dmarcMailbox: (d: string) =>
      ` Create the mailbox dmarc@${d} (or change the address) to receive the reports.`,
    step1: 'Step 1: monitor (2 to 4 weeks)',
    step1Note: (mailbox: string) =>
      `It does not block anything yet: you get reports on who sends email with your domain, to check your genuine email passes SPF or DKIM.${mailbox}`,
    step2: 'Step 2: to spam',
    step2Note:
      'Once the reports show your genuine email passes, fake emails will go to the spam folder.',
    step3: 'Step 3: reject',
    step3Note: 'Full protection: fake emails do not even arrive.',
  },
});

/**
 * Generador de registros DNS recomendados (SPF y DMARC) para copiar y pegar
 * en el panel del proveedor de dominio. Funciones puras: no hacen red.
 */

export type DnsRecordSuggestion = {
  type: 'TXT';
  /** Nombre tal como se escribe en la mayoría de paneles ("@" = el propio dominio). */
  host: string;
  /** Nombre completo, por si el panel lo pide así. */
  fqdn: string;
  value: string;
  /** Explicación corta: cuándo usarlo o qué ajustar. */
  note?: string;
  /** Para planes en varios pasos (DMARC). */
  label?: string;
};

/** `include:` de SPF de los proveedores de correo más habituales. */
export const PROVIDER_SPF: Record<string, string> = {
  'Google Workspace': 'include:_spf.google.com',
  'Microsoft 365': 'include:spf.protection.outlook.com',
  'Zoho Mail': 'include:zohomail.com',
  OVHcloud: 'include:mx.ovh.com',
  IONOS: 'include:_spf-eu.ionos.com',
  Hostinger: 'include:_spf.mail.hostinger.com',
  GoDaddy: 'include:secureserver.net',
  'Proton Mail': 'include:_spf.protonmail.ch',
};

export type SpfContext = {
  domain: string;
  /** Registros SPF actuales (0, 1 o varios). */
  current: string[];
  /** Proveedor de correo detectado por los MX, si se conoce. */
  provider: string | null;
  /** Hosts MX (para afinar, p. ej. Zoho Europa). */
  mxHosts: string[];
  /** `true` si el dominio no tiene MX (no recibe correo). */
  noMail: boolean;
  locale?: Locale;
};

const spfRecord = (domain: string, value: string, note?: string): DnsRecordSuggestion => ({
  type: 'TXT',
  host: '@',
  fqdn: domain,
  value,
  ...(note ? { note } : {}),
});

/** Mecanismos de un SPF sin `v=spf1` ni el `all` final. */
const mechanisms = (record: string) =>
  record
    .trim()
    .split(/\s+/)
    .slice(1)
    .filter((t) => !/^[+\-~?]?all$/i.test(t));

/**
 * SPF recomendado, o `null` si no se puede proponer uno automáticamente
 * (p. ej. demasiadas consultas: hay que decidir qué servicios quitar).
 */
export function suggestSpf(ctx: SpfContext): DnsRecordSuggestion | null {
  const { domain, current, provider, mxHosts, noMail } = ctx;
  const m = MSG[ctx.locale ?? 'es'];

  if (current.length === 0) {
    if (noMail) {
      return spfRecord(domain, 'v=spf1 -all', m.spfNoMail);
    }
    let include = provider ? PROVIDER_SPF[provider] : undefined;
    if (provider === 'Zoho Mail' && mxHosts.some((h) => /zoho\.eu\.?$/i.test(h))) {
      include = 'include:zohomail.eu';
    }
    return include
      ? spfRecord(domain, `v=spf1 ${include} ~all`, m.spfProvider(provider!, m.senders))
      : spfRecord(domain, 'v=spf1 mx ~all', m.spfMx(m.senders));
  }

  // Uno o varios registros: se unen en uno solo y se cierra con ~all.
  const merged = [...new Set(current.flatMap(mechanisms))];
  if (merged.length === 0) {
    return suggestSpf({ ...ctx, current: [] });
  }
  return spfRecord(
    domain,
    `v=spf1 ${merged.join(' ')} ~all`,
    current.length > 1 ? m.spfMerge : m.spfReplace,
  );
}

export type DmarcContext = {
  domain: string;
  /** Registro DMARC propio actual, si hay uno válido. */
  current: string | null;
  /** `true` si el dominio no tiene MX (no puede recibir los informes). */
  noMail: boolean;
  locale?: Locale;
};

const parseTags = (record: string) =>
  Object.fromEntries(
    record
      .split(';')
      .map((p) => p.split('='))
      .filter(([k, ...v]) => k && v.length)
      .map(([k, ...v]) => [k!.trim().toLowerCase(), v.join('=').trim()]),
  ) as Record<string, string>;

const dmarc = (
  domain: string,
  value: string,
  label: string,
  note: string,
): DnsRecordSuggestion => ({
  type: 'TXT',
  host: '_dmarc',
  fqdn: `_dmarc.${domain}`,
  value,
  label,
  note,
});

/**
 * Plan DMARC por pasos. Si el dominio no envía correo, se va directo a
 * `reject`; si no, se empieza observando con informes y se endurece después.
 */
export function suggestDmarc(ctx: DmarcContext): DnsRecordSuggestion[] {
  const { domain, current, noMail } = ctx;
  const m = MSG[ctx.locale ?? 'es'];
  if (noMail) {
    return [dmarc(domain, 'v=DMARC1; p=reject', m.dmarcRecommended, m.dmarcNoMail)];
  }
  const tags = current ? parseTags(current) : {};
  const rua = tags.rua ?? `mailto:dmarc@${domain}`;
  const policy = (tags.p ?? '').toLowerCase();
  const ruaNote = tags.rua ? '' : m.dmarcMailbox(domain);

  const steps = [
    dmarc(domain, `v=DMARC1; p=none; rua=${rua}`, m.step1, m.step1Note(ruaNote)),
    dmarc(domain, `v=DMARC1; p=quarantine; rua=${rua}`, m.step2, m.step2Note),
    dmarc(domain, `v=DMARC1; p=reject; rua=${rua}`, m.step3, m.step3Note),
  ];
  // Si ya está en "none", el siguiente paso es "quarantine".
  return policy === 'none' ? steps.slice(1) : steps;
}

/** Texto plano de un registro, para el resumen y el email. */
export const recordLine = (r: DnsRecordSuggestion) => `${r.type} ${r.host}: ${r.value}`;
