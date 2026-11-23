import { describe, expect, it } from 'vitest';
import { extractEmails, findContactPages, findInternalPages } from '@/lib/html';

describe('extractEmails', () => {
  it('encuentra emails en texto y en mailto, sin duplicados', () => {
    const html = `
      <p>Escríbenos a Info@MiNegocio.es o llama.</p>
      <a href="mailto:info@minegocio.es?subject=Hola">Email</a>
      <a href="MAILTO:ventas@minegocio.es,ana.garcia%40minegocio.es">Varios</a>
      <footer>pepe.perez@gmail.com</footer>`;
    expect(extractEmails(html)).toEqual({
      emails: [
        'ana.garcia@minegocio.es',
        'info@minegocio.es',
        'pepe.perez@gmail.com',
        'ventas@minegocio.es',
      ],
      protectedCount: 0,
    });
  });

  it('ignora scripts, estilos, nombres de archivo y ejemplos', () => {
    const html = `
      <script>var e = "oculto@minegocio.es";</script>
      <style>.x{background:url(logo@2x.png)}</style>
      <img src="foto@2x.jpg"> <p>icono@3x.webp tu@email.com nombre@dominio.com usuario@example.com</p>
      <a href="mailto:">vacío</a> <a href="mailto:%E0%A4%A">roto</a>`;
    expect(extractEmails(html).emails).toEqual([]);
  });

  it('cuenta las direcciones protegidas por Cloudflare', () => {
    const html = `<a href="/cdn-cgi/l/email-protection#abc"><span class="__cf_email__" data-cfemail="abc">[email&#160;protected]</span></a>`;
    expect(extractEmails(html)).toEqual({ emails: [], protectedCount: 2 });
  });
});

describe('findContactPages', () => {
  const html = `
    <a href="/contacto">Contacto</a>
    <a href="https://www.minegocio.es/aviso-legal/">Aviso legal</a>
    <a href="/p/123">Política de privacidad</a>
    <a href="/contacto#form">Contacto otra vez</a>
    <a href="https://facebook.com/contacto">Facebook</a>
    <a href="mailto:info@minegocio.es">Contacto por email</a>
    <a href="/">Inicio</a> <a href="http://[malo">Contacto roto</a>
    <a href="/cookies">Cookies</a>`;

  it('devuelve páginas del mismo sitio que suelen tener datos de contacto', () => {
    expect(findContactPages(html, 'https://minegocio.es/')).toEqual([
      'https://minegocio.es/contacto',
      'https://www.minegocio.es/aviso-legal/',
      'https://minegocio.es/p/123',
    ]);
  });

  it('respeta el máximo', () => {
    expect(findContactPages(html, 'https://minegocio.es/', 1)).toHaveLength(1);
  });

  it('no incluye la propia página', () => {
    expect(findContactPages('<a href="#">Contacto</a>', 'https://minegocio.es/contacto')).toEqual(
      [],
    );
  });
});

describe('findInternalPages', () => {
  const html = `
    <a href="/blog/entrada-1">Entrada</a>
    <header><nav>
      <a href="/">Inicio</a>
      <a href="/servicios/">Servicios</a>
      <a href="https://www.minegocio.es/tienda">Tienda</a>
      <a href="/servicios">Servicios otra vez</a>
      <a href="/contacto">Contacto</a>
    </nav></header>
    <a href="/carta.pdf">Carta</a> <a href="/wp-admin/">Admin</a> <a href="/carrito">Carrito</a>
    <a href="/buscar?q=x">Buscar</a> <a href="https://facebook.com/minegocio">FB</a>
    <a href="tel:+34600000000">Llamar</a> <a href="http://[malo">Roto</a>
    <a href="/equipo#fotos">Equipo</a>`;

  it('prioriza el menú y descarta ficheros, zonas privadas, parámetros y repetidas', () => {
    expect(
      findInternalPages(html, 'https://minegocio.es/', 10, ['https://minegocio.es/contacto']),
    ).toEqual([
      'https://minegocio.es/servicios/',
      'https://www.minegocio.es/tienda',
      'https://minegocio.es/blog/entrada-1',
      'https://minegocio.es/equipo',
    ]);
  });

  it('respeta el máximo', () => {
    expect(findInternalPages(html, 'https://minegocio.es/', 2)).toHaveLength(2);
  });
});
