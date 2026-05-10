import nodemailer from 'nodemailer';
import { getActiveAlerts, getAuctionsCreatedAfter } from './db';
import type { Alert, Auction, AlertFilters } from './types';

// SMTP config from environment variables
function getTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

const BASE_APP_URL = process.env.BASE_APP_URL || 'http://localhost:3000';

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/D';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/D';
  try {
    return new Date(date).toLocaleDateString('es-ES');
  } catch {
    return date;
  }
}

function buildAuctionHtml(auction: Auction): string {
  return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <a href="${BASE_APP_URL}/subasta/${auction.id}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
          ${escapeHtml(auction.titulo || `Subasta #${auction.source_id}`)}
        </a>
        <div style="color: #666; font-size: 13px; margin-top: 4px;">
          ${escapeHtml(auction.tipo_bien || '')} - ${escapeHtml(auction.provincia || '')}${auction.municipio ? `, ${escapeHtml(auction.municipio)}` : ''}
        </div>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">
        <div style="font-weight: bold; color: #16a34a;">${formatCurrency(auction.valor_subasta)}</div>
        ${auction.puja_minima ? `<div style="font-size: 13px; color: #666;">Puja min: ${formatCurrency(auction.puja_minima)}</div>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">
        <div>${formatDate(auction.fecha_fin)}</div>
        <div style="font-size: 12px; color: #888;">${escapeHtml(auction.estado || '')}</div>
      </td>
    </tr>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(auctions: Auction[], email: string, alertId: number): string {
  const auctionRows = auctions.map(a => buildAuctionHtml(a)).join('');
  const sourceLabels: Record<string, string> = {
    boe: 'BOE',
    hacienda: 'Agencia Tributaria',
    ss: 'Seguridad Social',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px 30px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: white; font-size: 22px;">Nuevas subastas encontradas</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
          ${auctions.length} subasta${auctions.length !== 1 ? 's' : ''} nueva${auctions.length !== 1 ? 's' : ''} que coinciden con tus filtros
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px; text-align: left; font-size: 13px; color: #666; border-bottom: 2px solid #e5e7eb;">Subasta</th>
              <th style="padding: 10px; text-align: right; font-size: 13px; color: #666; border-bottom: 2px solid #e5e7eb;">Precio</th>
              <th style="padding: 10px; text-align: center; font-size: 13px; color: #666; border-bottom: 2px solid #e5e7eb;">Fin</th>
            </tr>
          </thead>
          <tbody>
            ${auctionRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #666;">
        <p style="margin: 0 0 10px;">Este email se envio a <strong>${escapeHtml(email)}</strong></p>
        <p style="margin: 0;">
          <a href="${BASE_APP_URL}/api/alerts?id=${alertId}" style="color: #ef4444;">Cancelar esta alerta</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

function matchesFilters(auction: Auction, filters: AlertFilters): boolean {
  if (filters.provincia && auction.provincia) {
    if (!auction.provincia.toLowerCase().includes(filters.provincia.toLowerCase())) return false;
  }
  if (filters.tipo_bien && auction.tipo_bien) {
    if (!auction.tipo_bien.toLowerCase().includes(filters.tipo_bien.toLowerCase())) return false;
  }
  if (filters.precio_min !== undefined && auction.valor_subasta !== null && auction.valor_subasta !== undefined) {
    if (auction.valor_subasta < filters.precio_min) return false;
  }
  if (filters.precio_max !== undefined && auction.valor_subasta !== null && auction.valor_subasta !== undefined) {
    if (auction.valor_subasta > filters.precio_max) return false;
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = `${auction.titulo || ''} ${auction.descripcion || ''} ${auction.municipio || ''} ${auction.provincia || ''}`.toLowerCase();
    if (!searchable.includes(q)) return false;
  }
  return true;
}

// --- Send alerts to all active alert subscriptions ---
export async function sendAlerts(): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  const alerts = getActiveAlerts();
  console.log(`[Email] Processing ${alerts.length} active alerts`);

  // Look for auctions created in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const alert of alerts) {
    try {
      let filters: AlertFilters = {};
      try {
        filters = JSON.parse(alert.filtros_json);
      } catch {
        console.warn(`[Email] Invalid filters JSON for alert ${alert.id}`);
        continue;
      }

      const recentAuctions = getAuctionsCreatedAfter(since, filters);
      const matching = recentAuctions.filter(a => matchesFilters(a, filters));

      if (matching.length === 0) {
        continue;
      }

      console.log(`[Email] Alert ${alert.id}: ${matching.length} matching auctions for ${alert.email}`);

      const transporter = getTransporter();
      const html = buildEmailHtml(matching, alert.email, alert.id!);

      await transporter.sendMail({
        from: `"Subastas Alertas" <${process.env.SMTP_USER || 'noreply@subastas.example.com'}>`,
        to: alert.email,
        subject: `${matching.length} nueva${matching.length !== 1 ? 's' : ''} subasta${matching.length !== 1 ? 's' : ''} encontrada${matching.length !== 1 ? 's' : ''}`,
        html,
      });

      sent++;
    } catch (err: any) {
      console.error(`[Email] Error sending alert ${alert.id}:`, err.message);
      errors.push(`Alert ${alert.id}: ${err.message}`);
    }
  }

  console.log(`[Email] Sent ${sent} alerts, ${errors.length} errors`);
  return { sent, errors };
}

// --- Send a test email ---
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Subastas Alertas" <${process.env.SMTP_USER || 'noreply@subastas.example.com'}>`,
      to,
      subject: 'Subastas - Verificacion de alerta',
      html: `
        <h2>Alerta verificada</h2>
        <p>Tu alerta de subastas ha sido activada correctamente.</p>
        <p>Recibiras notificaciones cuando se publiquen nuevas subastas que coincidan con tus filtros.</p>
      `,
    });
    return true;
  } catch (err: any) {
    console.error('[Email] Test email error:', err.message);
    return false;
  }
}
