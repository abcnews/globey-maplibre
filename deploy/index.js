import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import ftp from "basic-ftp";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const DIST_DIR = path.resolve(PROJECT_ROOT, "dist-www");
const CREDENTIALS_PATH = path.resolve(os.homedir(), ".abc-credentials");

async function deploy() {
  console.log("🚀 Starting deployment...");

  /**
   * 1. Load project metadata
   */
  const packageJson = JSON.parse(
    await fs.readFile(path.resolve(PROJECT_ROOT, "package.json"), "utf8")
  );
  const { name, version } = packageJson;

  if (!name || !version) {
    throw new Error("Missing name or version in package.json");
  }

  /**
   * 2. Load credentials
   */
  let credentials;
  try {
    const credsRaw = await fs.readFile(CREDENTIALS_PATH, "utf8");
    credentials = JSON.parse(credsRaw).contentftp;
  } catch (err) {
    throw new Error(`Failed to read credentials from ${CREDENTIALS_PATH}: ${err.message}`);
  }

  if (!credentials) {
    throw new Error("Missing 'contentftp' credentials in ~/.abc-credentials");
  }

  /**
   * 3. Construct target path
   */
  const remoteDir = `/www/res/sites/news-projects/${name}/${version}/`;
  console.log(`📡 Target path: ${remoteDir}`);

  /**
   * 4. Connect to FTP
   */
  const client = new ftp.Client();
  // client.ftp.verbose = true;

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: Number(credentials.port) || 21,
      secure: false, // Basic FTP as per standard ABC setup, adjust if needed
    });

    /**
     * 5. Check if directory exists and prompt if it does
     */
    let exists = false;
    try {
      const list = await client.list(path.dirname(remoteDir));
      exists = list.some((item) => item.name === version);
    } catch (err) {
      // If parent dir doesn't exist, it definitely doesn't exist
      exists = false;
    }

    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(
      exists ? `⚠️  Directory ${remoteDir} already exists. Overwrite? (y/N): ` : 'Upload now? ?(y/N): '
    );
    rl.close();

    if (answer.toLowerCase() !== "y") {
      console.log("❌ Deployment cancelled.");
      return;
    }

    /**
     * 6. Upload files
     */
    console.log(`📤 Uploading contents of ${DIST_DIR} to ${remoteDir}...`);

    // Ensure the remote path exists
    await client.ensureDir(remoteDir);

    // Upload the directory contents
    await client.uploadFromDir(DIST_DIR);

    console.log(["✅ Deployment complete!", `Public dir https://www.abc.net.au/res/sites/news-projects/${name}/${version}/`]);
  } catch (err) {
    console.error(`❌ Deployment failed: ${err.message}`);
  } finally {
    client.close();
  }
}

deploy().catch((err) => {
  console.error(err);
  process.exit(1);
});
