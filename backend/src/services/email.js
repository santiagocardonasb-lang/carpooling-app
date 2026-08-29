// Envío de correo vía Brevo (antes Sendinblue). API HTTP, sin dependencias:
// Node 18+ trae fetch global.
//
// Variables de entorno requeridas (Render → Environment):
//   BREVO_API_KEY  clave de API de Brevo
//   MAIL_FROM      correo remitente ya verificado en Brevo
//   MAIL_FROM_NAME nombre visible del remitente (opcional)

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

function resetCodeTemplate(name, code) {
  const firstName = (name || '').split(' ')[0] || '';
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f4f5;padding:32px 16px">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
    <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#18181b">carpool</p>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a">Recuperación de contraseña</p>

    <p style="margin:0 0 8px;font-size:15px;color:#18181b">Hola${firstName ? ' ' + firstName : ''},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6">
      Usa este código para crear una contraseña nueva:
    </p>

    <div style="background:#18181b;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
      <span style="font-size:38px;font-weight:800;letter-spacing:12px;color:#ffffff;font-family:monospace">${code}</span>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#71717a;line-height:1.6">
      El código vence en <strong>10 minutos</strong> y solo se puede usar una vez.
    </p>
    <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6">
      Si no pediste este cambio, ignora este correo: tu contraseña sigue igual.
    </p>
  </div>
</div>`.trim();
}

async function sendResetCode(to, name, code) {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.error('[email] Falta BREVO_API_KEY o MAIL_FROM — no se envió el código');
    return false;
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.MAIL_FROM,
          name: process.env.MAIL_FROM_NAME || 'Carpool',
        },
        to: [{ email: to, name: name || to }],
        subject: `${code} es tu código para recuperar tu contraseña`,
        htmlContent: resetCodeTemplate(name, code),
      }),
    });

    if (!res.ok) {
      // No filtramos el cuerpo del error al cliente, solo al log del servidor.
      console.error('[email] Brevo respondió', res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Error enviando a Brevo:', err.message);
    return false;
  }
}

module.exports = { sendResetCode };
