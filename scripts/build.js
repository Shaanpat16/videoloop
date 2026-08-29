#!/usr/bin/env node
/**
 * Build step for the kiosk loop.
 *
 * Scans videos/ , copies everything into dist/ and writes dist/videos.json —
 * the manifest the player reads. Nothing to edit by hand: whatever video files
 * are in videos/ when this runs are what the screen plays.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const VIDEOS = path.join(ROOT, "videos");
const PUBLIC = path.join(ROOT, "public");
const DIST = path.join(ROOT, "dist");

const EXTS = [".mp4", ".webm", ".m4v", ".mov", ".ogv"];
const MIME = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
};

const GITHUB_FILE_LIMIT = 100 * 1024 * 1024; // hard limit, push is rejected above it
const GITHUB_WARN = 50 * 1024 * 1024; // GitHub warns above this

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function collectVideos() {
  if (!fs.existsSync(VIDEOS)) return [];

  return fs
    .readdirSync(VIDEOS, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .filter((e) => EXTS.includes(path.extname(e.name).toLowerCase()))
    .map((e) => {
      const stat = fs.statSync(path.join(VIDEOS, e.name));
      return {
        src: "videos/" + encodeURIComponent(e.name),
        name: e.name,
        type: MIME[path.extname(e.name).toLowerCase()] || "video/mp4",
        size: stat.size,
      };
    })
    // Alphabetical, natural-ish: "01-intro.mp4" and "2.mp4" sort sensibly.
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }));
}

function main() {
  rmrf(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  copyDir(PUBLIC, DIST);

  const videos = collectVideos();
  const distVideos = path.join(DIST, "videos");
  fs.mkdirSync(distVideos, { recursive: true });

  let total = 0;
  const problems = [];

  for (const v of videos) {
    fs.copyFileSync(path.join(VIDEOS, v.name), path.join(distVideos, v.name));
    total += v.size;
    if (v.size > GITHUB_FILE_LIMIT) problems.push(`${v.name} is ${mb(v.size)} — over GitHub's 100 MB file limit`);
    else if (v.size > GITHUB_WARN) problems.push(`${v.name} is ${mb(v.size)} — large, GitHub will warn on push`);
  }

  fs.writeFileSync(
    path.join(DIST, "videos.json"),
    JSON.stringify({ generated: new Date().toISOString(), count: videos.length, videos }, null, 2)
  );

  console.log(`\n  kiosk-loop build`);
  console.log(`  ----------------`);
  if (videos.length === 0) {
    console.log("  no videos found in videos/ — the screen will show the placeholder");
  } else {
    videos.forEach((v, i) => console.log(`  ${String(i + 1).padStart(2, " ")}. ${v.name}  (${mb(v.size)})`));
    console.log(`  ${videos.length} video(s), ${mb(total)} total`);
  }
  problems.forEach((p) => console.log(`  ! ${p}`));
  console.log(`  -> dist/\n`);
}

main();
