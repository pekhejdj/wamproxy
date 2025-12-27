# WamProxy

A Cloudflare Worker HTTP proxy service that forces all responses to be downloaded as attachments.

## Features
- Base64 encoded URL parameter for obfuscation
- Browser-like headers to avoid detection
- Force download all file types as attachments
- Preserve original content types

## Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Configure `wrangler.json` with your domain
4. Deploy: `npm run deploy`

## Usage
```

https://WORKERS_URL/?url=[BASE64_ENCODED_URL]

```

## Owner
Flather Communications Inc.

## License
MIT
