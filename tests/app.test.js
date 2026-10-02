import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/lib/db.js';

const app = createApp();

afterAll(async () => {
  await sequelize.close();
});

describe('app shell', () => {
  it('returns the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'No route for GET /api/does-not-exist.' },
    });
  });

  it('rejects malformed JSON with a 400', async () => {
    const res = await request(app)
      .post('/api/does-not-exist')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('reports health with the database status', async () => {
    const res = await request(app).get('/api/health');

    // 200 with a reachable test database, 503 without one; the shape is the same.
    expect([200, 503]).toContain(res.status);
    expect(res.body.data).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      db: expect.stringMatching(/^(up|down)$/),
    });
  });
});
