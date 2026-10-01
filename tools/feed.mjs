/**
 * Flux RSS des publications recentes.
 *
 * Le sitemap decrit toute la surface canonique ; ce flux, plus court, signale
 * les nouveaux articles rapidement aux lecteurs et aux robots qui acceptent
 * RSS comme source de decouverte.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { posts, ROOT, SITE, decode, resume } from "./build.mjs";

function xml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function dateRss(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toUTCString();
}

const recents = [...posts]
  .filter((post) => post.slug && post.date_gmt)
  .sort((a, b) => new Date(b.date_gmt) - new Date(a.date_gmt))
  .slice(0, 30);

const derniereMaj = recents.reduce((latest, post) => {
  const candidate = new Date(post.modified_gmt || post.date_gmt);
  return candidate > latest ? candidate : latest;
}, new Date(0));

const items = recents
  .map((post) => {
    const url = `${SITE}/${post.slug}/`;
    return `    <item>
      <title>${xml(decode(post.title.rendered))}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${xml(dateRss(post.date_gmt + "Z"))}</pubDate>
      <description>${xml(resume(post, 280))}</description>
    </item>`;
  })
  .join("\n");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>UFC.FR - Actualite MMA</title>
    <link>${SITE}/</link>
    <description>Les derniers articles du media MMA independant UFC.FR.</description>
    <language>fr-FR</language>
    <lastBuildDate>${derniereMaj.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

writeFileSync(join(ROOT, "feed.xml"), feed, "utf8");
console.log(`[feed] ${recents.length} articles`);
