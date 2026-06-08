import { NextRequest, NextResponse } from "next/server";

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

// Parses DuckDuckGo HTML search results
function parseDDGHtml(html: string): WebResult[] {
  const results: WebResult[] = [];

  // Match result blocks: <h2 class="..."><a href="...">title</a></h2> ... <a ...>snippet</a>
  // DDG HTML structure uses data-nir or result__body blocks
  const resultBlockRegex = /<div[^>]+class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;

  // Simpler approach: extract all links with snippets
  // DDG HTML result links have rel="noopener" and a real href
  const linkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*rel="noopener"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

  // Extract all anchors with result__a class (titles)
  const titleMatches = [...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const snippetMatches = [...html.matchAll(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];

  for (let i = 0; i < Math.min(titleMatches.length, 6); i++) {
    const rawUrl = titleMatches[i][1];
    const rawTitle = titleMatches[i][2];
    const rawSnippet = snippetMatches[i]?.[1] ?? "";

    // Decode DDG redirect URLs
    let url = rawUrl;
    const uddMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddMatch) {
      try { url = decodeURIComponent(uddMatch[1]); } catch { url = rawUrl; }
    }

    const title = rawTitle.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
    const snippet = rawSnippet.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();

    if (title && url.startsWith("http")) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ results: [] });

  try {
    // First try DuckDuckGo Instant Answers API
    const iaUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const iaRes = await fetch(iaUrl, {
      headers: { "User-Agent": "EchoSphere/1.0" },
      next: { revalidate: 0 },
    });

    const iaData = await iaRes.json();
    const iaResults: WebResult[] = [];

    if (iaData.AbstractText && iaData.AbstractURL) {
      iaResults.push({
        title: iaData.Heading || query,
        url: iaData.AbstractURL,
        snippet: iaData.AbstractText,
      });
    }

    if (iaData.Answer) {
      iaResults.push({ title: "Direct Answer", url: "", snippet: iaData.Answer });
    }

    const topics: Array<{ Text?: string; FirstURL?: string; Topics?: unknown[] }> = iaData.RelatedTopics ?? [];
    for (const t of topics) {
      if (iaResults.length >= 5) break;
      if (t.Text && t.FirstURL) {
        iaResults.push({
          title: t.Text.split(" - ")[0]?.trim() || t.Text.slice(0, 70),
          url: t.FirstURL as string,
          snippet: t.Text as string,
        });
      }
    }

    // If we got good instant results, return them
    if (iaResults.length >= 2) {
      return NextResponse.json({ results: iaResults.slice(0, 5), source: "instant" });
    }

    // Fallback: scrape DDG HTML search page
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const htmlRes = await fetch(htmlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html",
      },
      next: { revalidate: 0 },
    });

    const html = await htmlRes.text();
    const parsed = parseDDGHtml(html);

    if (parsed.length > 0) {
      return NextResponse.json({ results: parsed.slice(0, 5), source: "html" });
    }

    // If everything failed, return a link
    return NextResponse.json({
      results: [
        {
          title: `Search: ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "Click to open this search in DuckDuckGo.",
        },
      ],
      source: "fallback",
    });
  } catch (err) {
    console.error("[websearch] error:", err);
    return NextResponse.json({
      results: [
        {
          title: "Search unavailable",
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "Could not reach DuckDuckGo. Click to search manually.",
        },
      ],
      source: "error",
    });
  }
}
