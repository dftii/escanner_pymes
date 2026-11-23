import { existsSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeBrowserCookies, createBrowserRunner } from '@/lib/checks/browserCookies';

/**
 * Prueba de punta a punta con un Chromium real. Toda la "Internet" es un
 * servidor local: el proxy de salida recibe un conector que lleva cualquier
 * host a ese servidor. Se salta si no hay Chromium instalado
 * (`npx playwright-core install --only-shell chromium`).
 */
const hasChromium = (() => {
  try {
    return existsSync(process.env.CHROMIUM_PATH ?? chromium.executablePath());
  } catch {
    return false;
  }
})();

const PAGE = `<!doctype html><html><head>
<script src="http://www.googletagmanager.com/gtm.js?id=GTM-TEST"></script>
<script>document.cookie = '_ga=GA1.1.123; path=/';</script>
</head><body>
<h1>Mi negocio</h1>
<img src="http://10.0.0.1/interno.png">
<img src="http://169.254.169.254/latest/meta-data/">
<script>window.open('http://minegocio.test/popup'); alert('hola');</script>
</body></html>`;

let server: http.Server;
let origin = 0;
const hosts: string[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hosts.push(`${req.headers.host}${req.url}`);
    if (req.headers.host === 'minegocio.test' && req.url === '/') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('set-cookie', 'PHPSESSID=abc; Path=/; HttpOnly');
      res.end(PAGE);
      return;
    }
    res.setHeader('content-type', 'application/javascript');
    res.end('');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  origin = (server.address() as net.AddressInfo).port;
});
afterAll(() => new Promise((r) => server.close(r)));

describe.skipIf(!hasChromium)('createBrowserRunner (Chromium real)', () => {
  it('ve las cookies que crean los scripts y no deja salir a IPs internas', async () => {
    const run = createBrowserRunner({
      proxy: { dial: () => net.connect(origin, '127.0.0.1') },
    });
    const obs = await run('minegocio.test');

    expect(obs.finalUrl).toBe('http://minegocio.test/');
    expect(obs.cookies.map((c) => c.name).sort()).toEqual(['PHPSESSID', '_ga']);
    // Las imágenes a 10.0.0.1 y a la IP de metadatos de la nube no salen del proxy.
    expect(obs.blocked).toBeGreaterThanOrEqual(2);
    expect(hosts.some((h) => h.startsWith('10.') || h.startsWith('169.254'))).toBe(false);

    const finding = analyzeBrowserCookies(obs, ['PHPSESSID']);
    expect(finding.status).toBe('fail');
    expect(finding.detail).toContain('_ga (Google Analytics)');
    expect(finding.evidence?.trackersContacted).toEqual(['Google Tag Manager']);
  }, 60_000);

  it('devuelve un error claro si la web no carga', async () => {
    const run = createBrowserRunner({
      proxy: { dial: () => net.connect(1, '127.0.0.1') },
    });
    await expect(run('no-carga.test')).rejects.toThrow('No hemos podido abrir tu web');
  }, 60_000);
});
