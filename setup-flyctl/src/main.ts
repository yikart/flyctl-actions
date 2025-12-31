import * as core from "@actions/core";
import * as http from "@actions/http-client";
import * as toolCache from "@actions/tool-cache";
import { ARCHITECTURE, PLATFORM, VERSION } from "./constants.js";

const client = new http.HttpClient("setup-flyctl", [], {
  allowRetries: true,
  maxRetries: 3,
});

async function run() {
  // Resolve the version to a specific download via the Fly API
  const { url, resolvedVersion } = await resolveVersion(VERSION);

  // Install the resolved version if necessary
  const toolPath = toolCache.find("flyctl", resolvedVersion, ARCHITECTURE);
  if (toolPath) {
    core.addPath(toolPath);
  } else {
    await installFlyctl(url, resolvedVersion);
  }
}

async function resolveVersion(version: string) {
  // Use forked repository for releases
  let resolvedVersion = version;
  let url: string;

  if (version === "latest") {
    // Get the latest release from the forked repository
    const res = await client.get(
      "https://api.github.com/repos/yikart/flyctl/releases/latest",
    );
    const body = await res.readBody();
    if (!res.message.statusCode || res.message.statusCode >= 400)
      throw new Error(body);
    const release = JSON.parse(body);
    resolvedVersion = release.tag_name.replace(/^v/, "");

    // Find the appropriate asset for the platform and architecture
    const assetName = getAssetName(resolvedVersion);
    const asset = release.assets.find((a: any) => a.name === assetName);
    if (!asset) throw new Error(`No asset found for ${PLATFORM}/${ARCHITECTURE}`);
    url = asset.browser_download_url;
  } else {
    // Use specific version
    resolvedVersion = version;
    url = `https://github.com/yikart/flyctl/releases/download/v${version}/${getAssetName(version)}`;
  }

  return { url, resolvedVersion };
}

function getAssetName(version: string): string {
  if (PLATFORM === "Windows") {
    return `flyctl_${version}_Windows_${ARCHITECTURE}.zip`;
  }
  return `flyctl_${version}_${PLATFORM}_${ARCHITECTURE}.tar.gz`;
}

async function installFlyctl(url: string, resolvedVersion: string) {
  const downloadedPath = await toolCache.downloadTool(url);
  core.info(`Acquired ${resolvedVersion} from ${url}`);
  const extractedPath =
    PLATFORM === "Windows"
      ? await toolCache.extractZip(downloadedPath)
      : await toolCache.extractTar(downloadedPath);
  const cachedPath = await toolCache.cacheDir(
    extractedPath,
    "flyctl",
    resolvedVersion,
    ARCHITECTURE,
  );
  core.info(`Successfully cached flyctl to ${cachedPath}`);
  core.addPath(cachedPath);
  core.info("Added flyctl to the path");
}

run().catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error.message);
  } else {
    core.setFailed(`${error}`);
  }
});
