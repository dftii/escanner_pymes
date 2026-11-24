import { ImageResponse } from 'next/og';

export const alt = 'Escáner Pymes: comprueba si la web de tu negocio está bien protegida';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagen para cuando se comparte la web (WhatsApp, LinkedIn, X…). */
export default function OpengraphImage() {
  const grades = [
    ['A', '#047857'],
    ['B', '#4d7c0f'],
    ['C', '#b45309'],
    ['D', '#c2410c'],
  ] as const;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(135deg, #eef6ff 0%, #ffffff 55%, #fef3c7 100%)',
        color: '#0f172a',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#174ca8' }}>
        ESCÁNER PYMES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
          ¿Está bien protegida la web de tu negocio?
        </div>
        <div style={{ display: 'flex', fontSize: 32, color: '#334155' }}>
          SSL · Cabeceras · Correo (SPF, DMARC) · Cookies y RGPD
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {grades.map(([g, color]) => (
          <div
            key={g}
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: color,
              color: 'white',
              fontSize: 52,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {g}
          </div>
        ))}
        <div style={{ display: 'flex', marginLeft: 20, fontSize: 32, color: '#334155' }}>
          Informe gratis en un minuto, sin registrarte
        </div>
      </div>
    </div>,
    size,
  );
}
