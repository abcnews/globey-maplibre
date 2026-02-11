# Developing

## Development Server

To start the development server:

```bash
npm run dev
```

### SSL (HTTPS)

This project supports SSL for local development, which is required for some features (like geolocation or certain asset loading behaviors).

The server will automatically attempt to load certificates from your `aunty` SSL directory based on the host you are using.

#### 1. Generate Certificates

If you don't already have certificates for your development host, use the `aunty` CLI:

```bash
# Default host
aunty sign-cert

# Specific host
AUNTY_HOST=my-custom-host.aus.aunty.abc.net.au aunty sign-cert
```

This will create `server.crt` and `server.key` in `~/.aunty/ssl/<host>/`.

Once this is done you should trust it in your macOS Keychain to avoid browser warnings:

#### 3. Run with SSL

Once the certificate is in place, restart the dev server. Vite will automatically detect the certificates and serve over HTTPS.

```bash
npm run dev -- --host=your-host.aus.aunty.abc.net.au
```
