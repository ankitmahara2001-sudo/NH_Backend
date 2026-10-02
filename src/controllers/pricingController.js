import { buildQuote, serializeQuote } from '../services/quoteService.js';

/** POST /pricing/quote — full breakdown, or field errors for the date / travellers. */
export async function quote(req, res) {
  const result = await buildQuote(req.validated.body, { customerId: req.customer?.id ?? null });
  res.json({ data: serializeQuote(result) });
}
