export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ========== CORS BULLSHIT ==========
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }

    // ========== I SWEAR IF THIS DOESN'T WORK ==========
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

      // useragent because CLOUDFLARE KEEPS BLOCKING MY SHIT
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      const response = await fetch(targetUrl.toString(), { headers });

      if (!response.ok) {
        return new Response(JSON.stringify({
          error: `Upstream error: ${response.status}`,
          status: response.status,
          url: targetUrl.hostname
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Prepare response headers.... i guess
      const responseHeaders = new Headers(response.headers);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Extract or create filename.... i don't know why I'm doing this
      const pathParts = targetUrl.pathname.split('/');
      let filename = pathParts[pathParts.length - 1] || 'download';
      
      // Add extension if missing.... this doesn't seem nessessary
      if (!filename.includes('.') || filename.endsWith('/')) {
        const mimeToExt = {
          'text/html': 'html',
          'text/plain': 'txt',
          'application/json': 'json',
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'application/pdf': 'pdf'
        };
        
        const ext = mimeToExt[contentType.split(';')[0]] || 'bin';
        filename = filename.endsWith('/') ? 'index.' + ext : filename + '.' + ext;
      }
      
      // Clean filename
      filename = encodeURIComponent(filename.replace(/[^\w.-]/g, '_'));
      
      // Force download (attachment)
      responseHeaders.set('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      responseHeaders.set('Content-Type', contentType);
      
      // Add CORS headers
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Expose-Headers', '*');
      responseHeaders.set('Vary', 'Origin');
      
      // Add custom headers for tracking
      responseHeaders.set('X-WamProxy-Version', '1.0.0');
      responseHeaders.set('X-WamProxy-Owner', 'Flather Communications Inc.');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      console.error('WamProxy Error:', error);
      
      const errorResponse = {
        error: 'Internal proxy error',
        message: error.message,
        project: 'WamProxy',
        owner: 'Flather Communications Inc.',
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
