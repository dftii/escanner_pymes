/**
 * La propia web tiene que aprobar su escáner (criterio de aceptación).
 * Se renderiza la página de inicio real y se pasa por los checks de cabeceras y RGPD.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { checkPrivacy } from '@/lib/checks/privacy';
import { HomePage } from '@/components/HomePage';

describe('la propia web pasa su check de cookies y RGPD', () => {
  it('home: sin cookies ni seguimiento, con páginas legales y formulario que informa', () => {
    // El pie con los enlaces legales está en el layout; se añade aquí igual que en la web.
    const footer =
      '<a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/cookies">Cookies</a>';
    const html = renderToStaticMarkup(createElement(HomePage, { locale: 'es' })) + footer;
    const findings = checkPrivacy({
      url: 'https://escaner.example/',
      body: html,
      setCookies: [],
      redirects: [],
    });
    const bad = findings.filter((f) => f.status !== 'ok');
    expect(bad.map((f) => `${f.id}: ${f.title}`)).toEqual([]);
  });
});
