import { messages } from '../i18n';

/** Textos del check de correo (MX, SPF, DMARC, DKIM) en los tres idiomas. */
export const EMAIL_MSG = messages({
  es: {
    noProblems: 'Sin problemas.',
    mxNoneTitle: 'Tu dominio no recibe correo',
    mxNoneDetail: (d: string) =>
      `${d} no tiene servidores de correo (MX). Si usas un email de Gmail u Outlook para el negocio, es normal.`,
    mxNoneRisk:
      'Aunque no lo uses para correo, conviene publicar SPF y DMARC para que nadie lo suplante.',
    mxProviderTitle: (p: string) => `Recibes el correo en ${p}`,
    mxGenericTitle: 'Tu dominio tiene correo configurado',
    mxDetail: (list: string) => `Servidores de correo: ${list}.`,
    spfMissingTitle: 'Falta el registro SPF',
    spfMissingNoMail: (d: string) =>
      `${d} no dice qué servidores pueden enviar correo en su nombre. Si no envías correo con él, publica "v=spf1 -all".`,
    spfMissingDetail: (d: string) =>
      `${d} no dice qué servidores pueden enviar correo en su nombre.`,
    spfMissingRisk:
      'Cualquiera puede enviar emails haciéndose pasar por tu negocio, y tus correos legítimos acaban más en spam.',
    spfMultiTitle: 'Hay varios registros SPF y eso lo invalida',
    spfMultiDetail: (n: number) =>
      `Solo puede haber uno; ahora hay ${n}. Los servidores de correo los ignoran todos.`,
    spfMultiRisk: 'Es como no tener SPF: tu dominio se puede suplantar.',
    spfLookupsTitle: 'El SPF hace demasiadas consultas y deja de funcionar',
    spfLookupsDetail: (n: number, max: number) =>
      `Necesita ${n} consultas DNS y el máximo es ${max}. Los servidores de correo lo dan por erróneo.`,
    spfLookupsRisk: 'Tus emails pueden ir a spam y el dominio queda sin protección real.',
    spfOpenTitle: (q: string) => `El SPF termina en "${q}all" y no protege nada`,
    spfPlusDetail: 'Con "+all" autorizas a cualquier servidor del mundo a enviar correo como tú.',
    spfQuestionDetail: 'Con "?all" no indicas qué hacer con los correos falsos.',
    spfOpenRisk: 'Tu dominio se puede suplantar igual que si no tuvieras SPF.',
    spfNoAllTitle: 'El SPF no termina en "-all" ni "~all"',
    spfNoAllDetail: 'Falta la regla final que dice qué hacer con los servidores no autorizados.',
    spfNoAllRisk: 'La protección contra suplantación es débil.',
    spfLookupsNote: (n: number, max: number) => `Usa ${n} de ${max} consultas DNS.`,
    spfPtrNote: 'Incluye "ptr", un mecanismo obsoleto que conviene quitar.',
    spfSoftTitle: 'SPF configurado en modo flexible ("~all")',
    spfSoftDetail: (notes: string) =>
      `Los correos no autorizados se marcan como sospechosos, pero no se rechazan. ${notes}`,
    spfSoftRisk:
      'Protege bien si además tienes DMARC en "quarantine" o "reject". Sin DMARC, mejor "-all".',
    spfOkTitle: 'SPF configurado correctamente',
    spfOkDetail: (d: string, notes: string) =>
      `Solo los servidores autorizados pueden enviar correo como ${d}. ${notes}`,
    spfPtrRisk: 'Funciona, pero "ptr" ralentiza y algunos servidores lo ignoran.',
    dmarcMissingTitle: 'Falta la política DMARC',
    dmarcMissingDetail: (d: string) =>
      `${d} no indica a Gmail, Outlook y compañía qué hacer con los correos que se hacen pasar por ti.`,
    dmarcMissingRisk:
      'Los emails falsos en tu nombre (facturas, cambios de cuenta bancaria) llegan a tus clientes. Gmail y Yahoo ya exigen DMARC.',
    dmarcMultiTitle: 'Hay varios registros DMARC y eso lo invalida',
    dmarcMultiDetail: (name: string, n: number) =>
      `Solo puede haber uno en _dmarc.${name}; ahora hay ${n}.`,
    dmarcMultiRisk: 'Los servidores de correo ignoran la política: es como no tenerla.',
    dmarcInherited: (org: string) => ` (heredada de ${org})`,
    dmarcReports: (rua: string) => `Recibes informes en ${rua}.`,
    dmarcNoReports: 'No pides informes (rua): no sabrás si alguien intenta suplantarte.',
    dmarcPartialTitle: (policy: string, from: string, pct: number) =>
      `DMARC en "${policy}"${from}, pero solo para el ${pct} % de los correos`,
    dmarcActiveTitle: (policy: string, from: string) => `DMARC activo en modo "${policy}"${from}`,
    dmarcRejectDetail: 'Los correos falsos en tu nombre se rechazan.',
    dmarcQuarantineDetail: 'Los correos falsos en tu nombre van a la carpeta de spam.',
    dmarcPartialRisk: 'El resto de correos falsos sigue pasando.',
    dmarcNoneTitle: (tag: string, from: string) =>
      `DMARC solo observa ("${tag}=none")${from} y no bloquea nada`,
    dmarcNoneDetail: (reports: string) =>
      `La política está en modo de prueba: los correos falsos siguen llegando. ${reports}`,
    dmarcNoneRisk: 'Tu dominio se sigue pudiendo suplantar.',
    dmarcInvalidTitle: 'El registro DMARC no es válido',
    dmarcInvalidDetail: (p: string) =>
      `Falta la política "p=" o tiene un valor desconocido ("${p}").`,
    dmarcInvalidRisk: 'Los servidores de correo lo ignoran.',
    dkimOkTitle: 'Tus correos van firmados (DKIM)',
    dkimOkDetail: (list: string) => `Hemos encontrado firma DKIM con el selector ${list}.`,
    dkimOkRisk:
      'Sin problemas: los destinatarios pueden comprobar que el correo es tuyo y no se ha modificado.',
    dkimMissingTitle: 'No hemos encontrado firma DKIM',
    dkimMissingDetail: (list: string) =>
      `Hemos probado los selectores más comunes (${list}) sin éxito. Puede que la tengas con otro nombre: compruébalo en el panel de tu proveedor de correo.`,
    dkimMissingRisk:
      'Sin DKIM, tus correos tienen más probabilidades de ir a spam y DMARC protege menos.',
  },
  ca: {
    noProblems: 'Cap problema.',
    mxNoneTitle: 'El teu domini no rep correu',
    mxNoneDetail: (d: string) =>
      `${d} no té servidors de correu (MX). Si fas servir un correu de Gmail o Outlook per al negoci, és normal.`,
    mxNoneRisk:
      'Encara que no el facis servir per al correu, convé publicar SPF i DMARC perquè ningú no el suplanti.',
    mxProviderTitle: (p: string) => `Reps el correu a ${p}`,
    mxGenericTitle: 'El teu domini té correu configurat',
    mxDetail: (list: string) => `Servidors de correu: ${list}.`,
    spfMissingTitle: 'Falta el registre SPF',
    spfMissingNoMail: (d: string) =>
      `${d} no diu quins servidors poden enviar correu en el seu nom. Si no hi envies correu, publica "v=spf1 -all".`,
    spfMissingDetail: (d: string) =>
      `${d} no diu quins servidors poden enviar correu en el seu nom.`,
    spfMissingRisk:
      'Qualsevol pot enviar correus fent-se passar pel teu negoci, i els teus correus legítims acaben més sovint al correu brossa.',
    spfMultiTitle: "Hi ha diversos registres SPF i això l'invalida",
    spfMultiDetail: (n: number) =>
      `Només n'hi pot haver un; ara n'hi ha ${n}. Els servidors de correu els ignoren tots.`,
    spfMultiRisk: 'És com no tenir SPF: el teu domini es pot suplantar.',
    spfLookupsTitle: "L'SPF fa massa consultes i deixa de funcionar",
    spfLookupsDetail: (n: number, max: number) =>
      `Necessita ${n} consultes DNS i el màxim és ${max}. Els servidors de correu el donen per erroni.`,
    spfLookupsRisk:
      'Els teus correus poden anar a correu brossa i el domini queda sense protecció real.',
    spfOpenTitle: (q: string) => `L'SPF acaba en "${q}all" i no protegeix res`,
    spfPlusDetail: 'Amb "+all" autoritzes qualsevol servidor del món a enviar correu com tu.',
    spfQuestionDetail: 'Amb "?all" no indiques què cal fer amb els correus falsos.',
    spfOpenRisk: 'El teu domini es pot suplantar igual que si no tinguessis SPF.',
    spfNoAllTitle: 'L\'SPF no acaba en "-all" ni "~all"',
    spfNoAllDetail: 'Hi falta la regla final que diu què cal fer amb els servidors no autoritzats.',
    spfNoAllRisk: 'La protecció contra la suplantació és feble.',
    spfLookupsNote: (n: number, max: number) => `Fa servir ${n} de ${max} consultes DNS.`,
    spfPtrNote: 'Inclou "ptr", un mecanisme obsolet que convé treure.',
    spfSoftTitle: 'SPF configurat en mode flexible ("~all")',
    spfSoftDetail: (notes: string) =>
      `Els correus no autoritzats es marquen com a sospitosos, però no es rebutgen. ${notes}`,
    spfSoftRisk:
      'Protegeix bé si a més tens DMARC en "quarantine" o "reject". Sense DMARC, millor "-all".',
    spfOkTitle: 'SPF configurat correctament',
    spfOkDetail: (d: string, notes: string) =>
      `Només els servidors autoritzats poden enviar correu com a ${d}. ${notes}`,
    spfPtrRisk: 'Funciona, però "ptr" alenteix i alguns servidors l\'ignoren.',
    dmarcMissingTitle: 'Falta la política DMARC',
    dmarcMissingDetail: (d: string) =>
      `${d} no indica a Gmail, Outlook i companyia què han de fer amb els correus que es fan passar per tu.`,
    dmarcMissingRisk:
      'Els correus falsos en el teu nom (factures, canvis de compte bancari) arriben als teus clients. Gmail i Yahoo ja exigeixen DMARC.',
    dmarcMultiTitle: "Hi ha diversos registres DMARC i això l'invalida",
    dmarcMultiDetail: (name: string, n: number) =>
      `Només n'hi pot haver un a _dmarc.${name}; ara n'hi ha ${n}.`,
    dmarcMultiRisk: 'Els servidors de correu ignoren la política: és com no tenir-la.',
    dmarcInherited: (org: string) => ` (heretada de ${org})`,
    dmarcReports: (rua: string) => `Reps informes a ${rua}.`,
    dmarcNoReports: 'No demanes informes (rua): no sabràs si algú intenta suplantar-te.',
    dmarcPartialTitle: (policy: string, from: string, pct: number) =>
      `DMARC en "${policy}"${from}, però només per al ${pct} % dels correus`,
    dmarcActiveTitle: (policy: string, from: string) => `DMARC actiu en mode "${policy}"${from}`,
    dmarcRejectDetail: 'Els correus falsos en el teu nom es rebutgen.',
    dmarcQuarantineDetail: 'Els correus falsos en el teu nom van a la carpeta de correu brossa.',
    dmarcPartialRisk: 'La resta de correus falsos continua passant.',
    dmarcNoneTitle: (tag: string, from: string) =>
      `DMARC només observa ("${tag}=none")${from} i no bloqueja res`,
    dmarcNoneDetail: (reports: string) =>
      `La política està en mode de prova: els correus falsos continuen arribant. ${reports}`,
    dmarcNoneRisk: 'El teu domini encara es pot suplantar.',
    dmarcInvalidTitle: 'El registre DMARC no és vàlid',
    dmarcInvalidDetail: (p: string) =>
      `Hi falta la política "p=" o té un valor desconegut ("${p}").`,
    dmarcInvalidRisk: "Els servidors de correu l'ignoren.",
    dkimOkTitle: 'Els teus correus van signats (DKIM)',
    dkimOkDetail: (list: string) => `Hem trobat signatura DKIM amb el selector ${list}.`,
    dkimOkRisk:
      "Cap problema: els destinataris poden comprovar que el correu és teu i que no s'ha modificat.",
    dkimMissingTitle: 'No hem trobat signatura DKIM',
    dkimMissingDetail: (list: string) =>
      `Hem provat els selectors més habituals (${list}) sense èxit. Potser la tens amb un altre nom: comprova-ho al tauler del teu proveïdor de correu.`,
    dkimMissingRisk:
      "Sense DKIM, els teus correus tenen més probabilitats d'anar a correu brossa i DMARC protegeix menys.",
  },
  en: {
    noProblems: 'No problems.',
    mxNoneTitle: 'Your domain does not receive email',
    mxNoneDetail: (d: string) =>
      `${d} has no mail servers (MX). If you use a Gmail or Outlook address for the business, that is normal.`,
    mxNoneRisk:
      'Even if you do not use it for email, it is worth publishing SPF and DMARC so nobody can spoof it.',
    mxProviderTitle: (p: string) => `Your email is handled by ${p}`,
    mxGenericTitle: 'Your domain has email set up',
    mxDetail: (list: string) => `Mail servers: ${list}.`,
    spfMissingTitle: 'The SPF record is missing',
    spfMissingNoMail: (d: string) =>
      `${d} does not say which servers may send email on its behalf. If you do not send email from it, publish "v=spf1 -all".`,
    spfMissingDetail: (d: string) =>
      `${d} does not say which servers may send email on its behalf.`,
    spfMissingRisk:
      'Anyone can send emails pretending to be your business, and your genuine emails are more likely to end up in spam.',
    spfMultiTitle: 'There are several SPF records, which makes them invalid',
    spfMultiDetail: (n: number) =>
      `There can only be one; there are ${n}. Mail servers ignore all of them.`,
    spfMultiRisk: 'It is like having no SPF: your domain can be spoofed.',
    spfLookupsTitle: 'The SPF record makes too many lookups and stops working',
    spfLookupsDetail: (n: number, max: number) =>
      `It needs ${n} DNS lookups and the maximum is ${max}. Mail servers treat it as broken.`,
    spfLookupsRisk: 'Your emails may go to spam and the domain is left without real protection.',
    spfOpenTitle: (q: string) => `The SPF record ends in "${q}all" and protects nothing`,
    spfPlusDetail: 'With "+all" you allow any server in the world to send email as you.',
    spfQuestionDetail: 'With "?all" you do not say what to do with fake emails.',
    spfOpenRisk: 'Your domain can be spoofed just as if you had no SPF.',
    spfNoAllTitle: 'The SPF record does not end in "-all" or "~all"',
    spfNoAllDetail: 'The final rule saying what to do with unauthorised servers is missing.',
    spfNoAllRisk: 'The protection against spoofing is weak.',
    spfLookupsNote: (n: number, max: number) => `It uses ${n} of ${max} DNS lookups.`,
    spfPtrNote: 'It includes "ptr", an obsolete mechanism that should be removed.',
    spfSoftTitle: 'SPF set up in soft mode ("~all")',
    spfSoftDetail: (notes: string) =>
      `Unauthorised emails are marked as suspicious, but not rejected. ${notes}`,
    spfSoftRisk:
      'It protects well if you also have DMARC on "quarantine" or "reject". Without DMARC, "-all" is better.',
    spfOkTitle: 'SPF set up correctly',
    spfOkDetail: (d: string, notes: string) =>
      `Only authorised servers can send email as ${d}. ${notes}`,
    spfPtrRisk: 'It works, but "ptr" is slow and some servers ignore it.',
    dmarcMissingTitle: 'The DMARC policy is missing',
    dmarcMissingDetail: (d: string) =>
      `${d} does not tell Gmail, Outlook and others what to do with emails pretending to be you.`,
    dmarcMissingRisk:
      'Fake emails in your name (invoices, bank account changes) reach your customers. Gmail and Yahoo already require DMARC.',
    dmarcMultiTitle: 'There are several DMARC records, which makes them invalid',
    dmarcMultiDetail: (name: string, n: number) =>
      `There can only be one at _dmarc.${name}; there are ${n}.`,
    dmarcMultiRisk: 'Mail servers ignore the policy: it is like not having one.',
    dmarcInherited: (org: string) => ` (inherited from ${org})`,
    dmarcReports: (rua: string) => `You receive reports at ${rua}.`,
    dmarcNoReports:
      'You do not request reports (rua): you will not know if someone tries to spoof you.',
    dmarcPartialTitle: (policy: string, from: string, pct: number) =>
      `DMARC on "${policy}"${from}, but only for ${pct}% of emails`,
    dmarcActiveTitle: (policy: string, from: string) => `DMARC active in "${policy}" mode${from}`,
    dmarcRejectDetail: 'Fake emails in your name are rejected.',
    dmarcQuarantineDetail: 'Fake emails in your name go to the spam folder.',
    dmarcPartialRisk: 'The rest of the fake emails still get through.',
    dmarcNoneTitle: (tag: string, from: string) =>
      `DMARC only monitors ("${tag}=none")${from} and blocks nothing`,
    dmarcNoneDetail: (reports: string) =>
      `The policy is in test mode: fake emails still get through. ${reports}`,
    dmarcNoneRisk: 'Your domain can still be spoofed.',
    dmarcInvalidTitle: 'The DMARC record is not valid',
    dmarcInvalidDetail: (p: string) =>
      `The "p=" policy is missing or has an unknown value ("${p}").`,
    dmarcInvalidRisk: 'Mail servers ignore it.',
    dkimOkTitle: 'Your emails are signed (DKIM)',
    dkimOkDetail: (list: string) => `We found a DKIM signature with the selector ${list}.`,
    dkimOkRisk:
      'No problems: recipients can check the email is really yours and has not been altered.',
    dkimMissingTitle: 'We did not find a DKIM signature',
    dkimMissingDetail: (list: string) =>
      `We tried the most common selectors (${list}) without success. You may have it under another name: check your email provider's dashboard.`,
    dkimMissingRisk:
      'Without DKIM, your emails are more likely to go to spam and DMARC protects less.',
  },
});
