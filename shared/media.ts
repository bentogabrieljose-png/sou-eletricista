export function youtubeEmbedUrl(rawUrl: string): string | null {
  try {
    const link = new URL(rawUrl);
    const host = link.hostname.toLowerCase();
    const id = host === "youtu.be" ? link.pathname.slice(1).split("/")[0] :
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)
        ? link.pathname.startsWith("/shorts/") || link.pathname.startsWith("/embed/") ? link.pathname.split("/")[2] : link.pathname === "/watch" ? link.searchParams.get("v") : null
        : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
  } catch { return null; }
}
