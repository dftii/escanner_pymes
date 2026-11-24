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

const SENDERS_NOTE =
  'Si envías correo desde otros servicios (Mailchimp, Brevo, la tienda online, el formulario de la web), añade su "include:" antes del final; cada uno lo indica en su ayuda.';

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

  if (current.length === 0) {
    if (noMail) {
      return spfRecord(
        domain,
        'v=spf1 -all',
        'Tu dominio no tiene correo: así declaras que nadie puede enviar emails en su nombre. Si en realidad sí envías correo con él, no lo uses.',
      );
    }
    let include = provider ? PROVIDER_SPF[provider] : undefined;
    if (provider === 'Zoho Mail' && mxHosts.some((h) => /zoho\.eu\.?$/i.test(h))) {
      include = 'include:zohomail.eu';
    }
    return include
      ? spfRecord(
          domain,
          `v=spf1 ${include} ~all`,
          `Autoriza a ${provider} a enviar tu correo. ${SENDERS_NOTE}`,
        )
      : spfRecord(
          domain,
          'v=spf1 mx ~all',
          `Autoriza a tus servidores de correo (MX). Si tu proveedor te da un "include:", úsalo en lugar de "mx". ${SENDERS_NOTE}`,
        );
  }

  // Uno o varios registros: se unen en uno solo y se cierra con ~all.
  const merged = [...new Set(current.flatMap(mechanisms))];
  if (merged.length === 0) {
    return suggestSpf({ ...ctx, current: [] });
  }
  return spfRecord(
    domain,
    `v=spf1 ${merged.join(' ')} ~all`,
    current.length > 1
      ? 'Une tus registros SPF en este único registro y borra los demás: solo puede haber uno.'
      : 'Sustituye tu registro SPF actual por este: mantiene los mismos servicios y corrige el final.',
  );
}

export type DmarcContext = {
  domain: string;
  /** Registro DMARC propio actual, si hay uno válido. */
  current: string | null;
  /** `true` si el dominio no tiene MX (no puede recibir los informes). */
  noMail: boolean;
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
  if (noMail) {
    return [
      dmarc(
        domain,
        'v=DMARC1; p=reject',
        'Recomendado',
        'Tu dominio no envía correo, así que puedes rechazar directamente cualquier email que se haga pasar por él.',
      ),
    ];
  }
  const tags = current ? parseTags(current) : {};
  const rua = tags.rua ?? `mailto:dmarc@${domain}`;
  const policy = (tags.p ?? '').toLowerCase();
  const ruaNote = tags.rua
    ? ''
    : ` Crea el buzón dmarc@${domain} (o cambia la dirección) para recibir los informes.`;

  const steps = [
    dmarc(
      domain,
      `v=DMARC1; p=none; rua=${rua}`,
      'Paso 1: observar (2 a 4 semanas)',
      `No bloquea nada todavía: recibes informes de quién envía correo con tu dominio, para comprobar que tus envíos legítimos pasan SPF o DKIM.${ruaNote}`,
    ),
    dmarc(
      domain,
      `v=DMARC1; p=quarantine; rua=${rua}`,
      'Paso 2: a spam',
      'Cuando los informes muestren que tu correo legítimo pasa, los emails falsos irán a la carpeta de spam.',
    ),
    dmarc(
      domain,
      `v=DMARC1; p=reject; rua=${rua}`,
      'Paso 3: rechazar',
      'La protección completa: los emails falsos ni siquiera llegan.',
    ),
  ];
  // Si ya está en "none", el siguiente paso es "quarantine".
  return policy === 'none' ? steps.slice(1) : steps;
}

/** Texto plano de un registro, para el resumen y el email. */
export const recordLine = (r: DnsRecordSuggestion) => `${r.type} ${r.host}: ${r.value}`;
