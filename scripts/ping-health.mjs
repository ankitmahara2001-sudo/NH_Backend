// Run from an external scheduler, not inside the API process that may be asleep.
const baseUrl = process.env.BACKEND_URL;
if (!baseUrl) {
  console.error('Set BACKEND_URL to the deployed backend HTTPS URL.');
  process.exit(1);
}

try {
  const url = new URL('/api/health/live', baseUrl);
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  // Retry transient failures while Railway wakes a sleeping service.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('Health request failed');
      const body = await response.json();
      if (body.data?.status !== 'ok') throw new Error('Unexpected health response');
      console.log('Backend health check passed.');
      break;
    } catch {
      if (attempt === 3) throw new Error('Health check failed after three attempts');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
} catch {
  console.error('Backend health check failed. Check BACKEND_URL and deployment status.');
  process.exitCode = 1;
}
