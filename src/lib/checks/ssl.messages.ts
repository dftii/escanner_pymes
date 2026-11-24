import { messages } from '../i18n';

const days = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Textos del check SSL en los tres idiomas. */
export const SSL_MSG = messages({
  es: {
    noHttpsTitle: 'Tu web no tiene una conexión segura (HTTPS)',
    noHttpsDetail: (domain: string) =>
      `No hemos podido abrir una conexión segura con ${domain}. Los visitantes ven el aviso "No seguro" en el navegador.`,
    noHttpsRisk:
      'Todo lo que se envía desde tu web (formularios, contraseñas) viaja sin cifrar y los clientes desconfían.',
    unknownIssuer: 'un emisor desconocido',
    trustOkTitle: 'El certificado es de confianza',
    trustOkDetail: (issuer: string) =>
      `Lo emite ${issuer}, una entidad que reconocen todos los navegadores.`,
    trustOkRisk: 'Los visitantes ven el candado sin avisos.',
    chainTitle: 'El certificado está mal instalado (falta la cadena)',
    chainDetail: (issuer: string) =>
      `Tu servidor no envía el certificado intermedio de ${issuer}. Algunos navegadores y móviles mostrarán un error de seguridad.`,
    chainRisk: 'Parte de tus visitantes verán una pantalla de "conexión no segura" y se irán.',
    selfSignedTitle: 'El certificado es autofirmado y ningún navegador lo acepta',
    untrustedTitle: 'El certificado no es de confianza',
    selfSignedDetail:
      'El certificado lo ha creado el propio servidor en lugar de una autoridad reconocida.',
    untrustedDetail: (issuer: string) =>
      `Los navegadores no reconocen el certificado emitido por ${issuer}.`,
    untrustedRisk:
      'Los visitantes ven una pantalla de aviso a pantalla completa antes de entrar en tu web.',
    expiredTitle: 'El certificado está caducado',
    expiredDetail: (when: string, n: number) =>
      `Caducó el ${when} (hace ${days(n, 'día', 'días')}).`,
    expiredRisk:
      'Los navegadores bloquean la entrada con un aviso de seguridad: estás perdiendo visitas.',
    expiringTitle: (n: number) => `El certificado caduca en ${days(n, 'día', 'días')}`,
    expiringDetail: (when: string) =>
      `Vence el ${when}. Si tiene renovación automática debería renovarse antes; si no, hazlo ya.`,
    expiringRisk: 'Si caduca, los navegadores mostrarán un aviso de seguridad a tus clientes.',
    validTitle: (n: number) => `El certificado es válido ${n} días más`,
    validDetail: (when: string) => `Vence el ${when}.`,
    validRisk: 'Nada urgente: comprueba que la renovación automática está activada.',
    hostnameOkTitle: 'El certificado corresponde a tu dominio',
    hostnameOkDetail: (domain: string) => `Cubre ${domain}.`,
    hostnameOkRisk: 'Sin problemas de nombre.',
    hostnameBadTitle: 'El certificado es de otro dominio',
    hostnameBadDetail: (domain: string, names: string) =>
      `El certificado instalado no incluye ${domain}${names ? ` (cubre: ${names})` : ''}.`,
    hostnameBadRisk:
      'Los navegadores muestran un aviso de "conexión no privada" y bloquean la entrada.',
    wwwNoTls: 'responde, pero sin conexión segura',
    wwwNotCovered: 'tiene un certificado que no la incluye',
    wwwOkTitle: (host: string) => `La versión ${host} también es segura`,
    wwwOkDetail: (host: string) => `Si un cliente escribe ${host}, también ve el candado.`,
    noProblems: 'Sin problemas.',
    wwwBadTitle: (host: string) => `La dirección ${host} da error de seguridad`,
    wwwBadDetail: (host: string, what: string) =>
      `${host} ${what}. Quien la escriba así verá un aviso del navegador.`,
    wwwBadRisk: 'Muchos clientes escriben la web con o sin "www": parte de ellos verá un error.',
    protoOkTitle: (p: string) => `Usa una versión moderna de cifrado (${p})`,
    protoOkDetail: 'La conexión usa un protocolo actual y seguro.',
    protoBadTitle: 'Usa una versión de cifrado obsoleta',
    protoBadDetail: (p: string | null) =>
      `El servidor ha negociado ${p ?? 'un protocolo desconocido'}, que está retirado por inseguro.`,
    protoBadRisk:
      'Los navegadores modernos pueden rechazar la conexión y el cifrado es vulnerable.',
    noHttpTitle: 'No hay versión sin cifrar de tu web',
    noHttpDetail: 'Tu servidor no responde por http, así que nadie puede ver la web sin cifrar.',
    noHttpRisk: 'Sin problemas, aunque lo habitual es redirigir http a https.',
    redirOkTitle: 'La versión sin cifrar redirige a la segura',
    redirOkDetail: (domain: string, origin: string) =>
      `Quien entra por http://${domain} acaba en ${origin}.`,
    redirBadTitle: 'Tu web se puede ver sin cifrar',
    redirBadDetail: (domain: string) =>
      `Si alguien entra por http://${domain}, la web se carga sin el candado en lugar de llevarle a la versión segura.`,
    redirBadRisk:
      'Los datos de esa visita viajan sin cifrar y el navegador marca la página como "No segura".',
  },
  ca: {
    noHttpsTitle: 'El teu web no té una connexió segura (HTTPS)',
    noHttpsDetail: (domain: string) =>
      `No hem pogut obrir una connexió segura amb ${domain}. Els visitants veuen l'avís "No segur" al navegador.`,
    noHttpsRisk:
      "Tot el que s'envia des del teu web (formularis, contrasenyes) viatja sense xifrar i els clients desconfien.",
    unknownIssuer: 'un emissor desconegut',
    trustOkTitle: 'El certificat és de confiança',
    trustOkDetail: (issuer: string) =>
      `L'emet ${issuer}, una entitat que reconeixen tots els navegadors.`,
    trustOkRisk: 'Els visitants veuen el cadenat sense avisos.',
    chainTitle: 'El certificat està mal instal·lat (hi falta la cadena)',
    chainDetail: (issuer: string) =>
      `El teu servidor no envia el certificat intermedi de ${issuer}. Alguns navegadors i mòbils mostraran un error de seguretat.`,
    chainRisk: 'Part dels teus visitants veuran una pantalla de "connexió no segura" i marxaran.',
    selfSignedTitle: 'El certificat és autosignat i cap navegador no l’accepta',
    untrustedTitle: 'El certificat no és de confiança',
    selfSignedDetail:
      "El certificat l'ha creat el mateix servidor en lloc d'una autoritat reconeguda.",
    untrustedDetail: (issuer: string) =>
      `Els navegadors no reconeixen el certificat emès per ${issuer}.`,
    untrustedRisk:
      "Els visitants veuen una pantalla d'avís a pantalla completa abans d'entrar al teu web.",
    expiredTitle: 'El certificat ha caducat',
    expiredDetail: (when: string, n: number) =>
      `Va caducar el ${when} (fa ${days(n, 'dia', 'dies')}).`,
    expiredRisk:
      "Els navegadors bloquegen l'entrada amb un avís de seguretat: estàs perdent visites.",
    expiringTitle: (n: number) => `El certificat caduca d'aquí a ${days(n, 'dia', 'dies')}`,
    expiringDetail: (when: string) =>
      `Venç el ${when}. Si té renovació automàtica s'hauria de renovar abans; si no, fes-ho ara.`,
    expiringRisk: 'Si caduca, els navegadors mostraran un avís de seguretat als teus clients.',
    validTitle: (n: number) => `El certificat és vàlid ${n} dies més`,
    validDetail: (when: string) => `Venç el ${when}.`,
    validRisk: 'Res urgent: comprova que la renovació automàtica està activada.',
    hostnameOkTitle: 'El certificat correspon al teu domini',
    hostnameOkDetail: (domain: string) => `Cobreix ${domain}.`,
    hostnameOkRisk: 'Cap problema de nom.',
    hostnameBadTitle: "El certificat és d'un altre domini",
    hostnameBadDetail: (domain: string, names: string) =>
      `El certificat instal·lat no inclou ${domain}${names ? ` (cobreix: ${names})` : ''}.`,
    hostnameBadRisk:
      'Els navegadors mostren un avís de "connexió no privada" i bloquegen l\'entrada.',
    wwwNoTls: 'respon, però sense connexió segura',
    wwwNotCovered: 'té un certificat que no la inclou',
    wwwOkTitle: (host: string) => `La versió ${host} també és segura`,
    wwwOkDetail: (host: string) => `Si un client escriu ${host}, també veu el cadenat.`,
    noProblems: 'Cap problema.',
    wwwBadTitle: (host: string) => `L'adreça ${host} dona error de seguretat`,
    wwwBadDetail: (host: string, what: string) =>
      `${host} ${what}. Qui l'escrigui així veurà un avís del navegador.`,
    wwwBadRisk: 'Molts clients escriuen el web amb "www" o sense: una part veurà un error.',
    protoOkTitle: (p: string) => `Fa servir una versió moderna de xifratge (${p})`,
    protoOkDetail: 'La connexió fa servir un protocol actual i segur.',
    protoBadTitle: 'Fa servir una versió de xifratge obsoleta',
    protoBadDetail: (p: string | null) =>
      `El servidor ha negociat ${p ?? 'un protocol desconegut'}, que està retirat per insegur.`,
    protoBadRisk: 'Els navegadors moderns poden rebutjar la connexió i el xifratge és vulnerable.',
    noHttpTitle: 'No hi ha versió sense xifrar del teu web',
    noHttpDetail:
      'El teu servidor no respon per http, així que ningú no pot veure el web sense xifrar.',
    noHttpRisk: "Cap problema, tot i que l'habitual és redirigir http a https.",
    redirOkTitle: 'La versió sense xifrar redirigeix a la segura',
    redirOkDetail: (domain: string, origin: string) =>
      `Qui entra per http://${domain} acaba a ${origin}.`,
    redirBadTitle: 'El teu web es pot veure sense xifrar',
    redirBadDetail: (domain: string) =>
      `Si algú entra per http://${domain}, el web es carrega sense el cadenat en lloc de portar-lo a la versió segura.`,
    redirBadRisk:
      'Les dades d\'aquesta visita viatgen sense xifrar i el navegador marca la pàgina com a "No segura".',
  },
  en: {
    noHttpsTitle: 'Your website has no secure connection (HTTPS)',
    noHttpsDetail: (domain: string) =>
      `We could not open a secure connection to ${domain}. Visitors see a "Not secure" warning in the browser.`,
    noHttpsRisk:
      'Everything sent from your website (forms, passwords) travels unencrypted and customers lose trust.',
    unknownIssuer: 'an unknown issuer',
    trustOkTitle: 'The certificate is trusted',
    trustOkDetail: (issuer: string) =>
      `It is issued by ${issuer}, an authority recognised by every browser.`,
    trustOkRisk: 'Visitors see the padlock with no warnings.',
    chainTitle: 'The certificate is installed incorrectly (missing chain)',
    chainDetail: (issuer: string) =>
      `Your server does not send the intermediate certificate from ${issuer}. Some browsers and phones will show a security error.`,
    chainRisk: 'Some of your visitors will see a "connection not secure" screen and leave.',
    selfSignedTitle: 'The certificate is self-signed and no browser accepts it',
    untrustedTitle: 'The certificate is not trusted',
    selfSignedDetail:
      'The certificate was created by the server itself instead of a recognised authority.',
    untrustedDetail: (issuer: string) =>
      `Browsers do not recognise the certificate issued by ${issuer}.`,
    untrustedRisk: 'Visitors see a full-screen warning before they can enter your website.',
    expiredTitle: 'The certificate has expired',
    expiredDetail: (when: string, n: number) =>
      `It expired on ${when} (${days(n, 'day', 'days')} ago).`,
    expiredRisk: 'Browsers block access with a security warning: you are losing visitors.',
    expiringTitle: (n: number) => `The certificate expires in ${days(n, 'day', 'days')}`,
    expiringDetail: (when: string) =>
      `It expires on ${when}. If it renews automatically it should be renewed before then; if not, do it now.`,
    expiringRisk: 'If it expires, browsers will show your customers a security warning.',
    validTitle: (n: number) => `The certificate is valid for ${n} more days`,
    validDetail: (when: string) => `It expires on ${when}.`,
    validRisk: 'Nothing urgent: check that automatic renewal is turned on.',
    hostnameOkTitle: 'The certificate matches your domain',
    hostnameOkDetail: (domain: string) => `It covers ${domain}.`,
    hostnameOkRisk: 'No name problems.',
    hostnameBadTitle: 'The certificate belongs to another domain',
    hostnameBadDetail: (domain: string, names: string) =>
      `The installed certificate does not include ${domain}${names ? ` (it covers: ${names})` : ''}.`,
    hostnameBadRisk: 'Browsers show a "connection is not private" warning and block access.',
    wwwNoTls: 'responds, but without a secure connection',
    wwwNotCovered: 'has a certificate that does not include it',
    wwwOkTitle: (host: string) => `The ${host} version is also secure`,
    wwwOkDetail: (host: string) => `If a customer types ${host}, they also see the padlock.`,
    noProblems: 'No problems.',
    wwwBadTitle: (host: string) => `The address ${host} gives a security error`,
    wwwBadDetail: (host: string, what: string) =>
      `${host} ${what}. Anyone who types it that way will see a browser warning.`,
    wwwBadRisk: 'Many customers type the address with or without "www": some will see an error.',
    protoOkTitle: (p: string) => `Uses a modern encryption version (${p})`,
    protoOkDetail: 'The connection uses a current, secure protocol.',
    protoBadTitle: 'Uses an outdated encryption version',
    protoBadDetail: (p: string | null) =>
      `The server negotiated ${p ?? 'an unknown protocol'}, which has been retired as insecure.`,
    protoBadRisk: 'Modern browsers may refuse the connection and the encryption is vulnerable.',
    noHttpTitle: 'There is no unencrypted version of your website',
    noHttpDetail: 'Your server does not answer over http, so nobody can see the site unencrypted.',
    noHttpRisk: 'No problems, although the usual approach is to redirect http to https.',
    redirOkTitle: 'The unencrypted version redirects to the secure one',
    redirOkDetail: (domain: string, origin: string) =>
      `Anyone visiting http://${domain} ends up at ${origin}.`,
    redirBadTitle: 'Your website can be viewed unencrypted',
    redirBadDetail: (domain: string) =>
      `If someone visits http://${domain}, the site loads without the padlock instead of taking them to the secure version.`,
    redirBadRisk:
      'The data from that visit travels unencrypted and the browser marks the page as "Not secure".',
  },
});
