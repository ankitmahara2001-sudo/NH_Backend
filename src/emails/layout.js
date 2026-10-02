// Shared branded layout for every email: inline styles only (email clients ignore <style>).

const COLORS = {
  navy: '#0F1B2D',
  gold: '#C8893A',
  page: '#F7F5F1',
  text: '#1D2230',
  muted: '#5E6470',
  border: '#E6E1D8',
};

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes user-provided text before it goes into email HTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** A two-column table of label/value rows, e.g. a booking summary. */
export function detailsTable(rows) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:${COLORS.muted};font-size:14px">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;text-align:right;font-size:14px;font-weight:700">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.border};margin:16px 0">${cells}</table>`;
}

export function detailsText(rows) {
  return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
}

export function button(label, href) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${COLORS.navy};color:#FFFFFF;font-weight:700;text-decoration:none">${escapeHtml(label)}</a></p>`;
}

export function paragraph(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:24px;color:${COLORS.text}">${escapeHtml(text)}</p>`;
}

/**
 * Wraps the body in the branded frame.
 * @param {{ title: string, bodyHtml: string, bodyText: string, branding: { companyName: string, footerText: string } }} input
 */
export function renderLayout({ title, bodyHtml, bodyText, branding }) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:${COLORS.page};font-family:Manrope,Arial,Helvetica,sans-serif;color:${COLORS.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden">
<tr><td style="background:${COLORS.navy};padding:20px 28px;color:#FFFFFF;font-size:18px;font-weight:800">
<span style="color:${COLORS.gold}">&#9650;</span> ${escapeHtml(branding.companyName)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;color:${COLORS.text}">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid ${COLORS.border};font-size:12px;line-height:18px;color:${COLORS.muted}">${escapeHtml(branding.footerText)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = `${title}\n\n${bodyText}\n\n--\n${branding.footerText}`;
  return { html, text };
}
