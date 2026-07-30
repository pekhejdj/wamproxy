export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ========== CORS PREFLIGHT ==========
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }

    // ========== GET TARGET URL ==========
    const encodedTarget = url.searchParams.get('url');

    if (!encodedTarget) {
      return new Response(JSON.stringify({ 
        error: 'Missing "url" parameter (base64 encoded)',
        project: 'WamProxy',
        owner: 'Flather Communications Inc.'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      const decodedUrl = atob(encodedTarget);
      let targetUrl;
      
      try {
        targetUrl = new URL(decodedUrl);
        if (!['http:', 'https:'].includes(targetUrl.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Invalid URL format. Must be a valid HTTP/HTTPS URL.',
          example: 'aHR0cHM6Ly9leGFtcGxlLmNvbS9maWxlLnBuZw=='
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Prepare request headers (forward incoming headers like content-type)
      const forwardHeaders = new Headers(request.headers);
      
      // Remove host headers so target server accepts request
      forwardHeaders.delete('host');
      forwardHeaders.delete('referer');

      if (!forwardHeaders.has('User-Agent')) {
        forwardHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      }

      // Forward request method & body (GET, POST, multipart, etc.)
      const fetchInit = {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'follow'
      };

      // Only attach body for non-GET / non-HEAD requests
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        fetchInit.body = request.body;
      }

      const response = await fetch(targetUrl.toString(), fetchInit);

      // Prepare response headers & add CORS
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Expose-Headers', '*');
      responseHeaders.set('X-WamProxy-Version', '1.1.0');
      responseHeaders.set('X-WamProxy-Owner', 'Flather Communications Inc.');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      console.error('WamProxy Error:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal proxy error',
        message: error.message,
        project: 'WamProxy',
        owner: 'Flather Communications Inc.',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
