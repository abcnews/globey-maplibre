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
AUNTY_HOST=my-custom-host.aus.aunty.abc.net.au npx @abcnews/aunty sign-cert
```

This will create `server.crt` and `server.key` in `~/.aunty/ssl/<host>/`.

Once this is done you should trust it in your macOS Keychain to avoid browser warnings:

```bash
npm run dev -- --host=your-host.aus.aunty.abc.net.au
```

## Deployment

To deploy the project to the ABC content FTP:

1.  **Version**: Increment the version number according to [SemVer](https://docs.npmjs.com/about-semantic-versioning) using [`npm version`](https://docs.npmjs.com/cli/commands/npm-version).
2.  **Deploy**: Run `npm run deploy`.

If the target version directory already exists on the server, you will be prompted before it is overwritten.


