// Hàm parse link từ chuỗi HTML <a>
export const parseLink = (html: string) => {
  const match = html.match(/href="([^"]+)".*>([^<]+)<\/a>/);

  if (match) {
    return { url: match[1], text: match[2] };
  }
  return null;
};

export function parseLinkHtml(html: string) {
  if (!html) return { url: "", text: "" };

  const urlMatch = html.match(/href="([^"]+)"/);
  const textMatch = html.replace(/<[^>]+>/g, "").trim();

  return {
    url: urlMatch ? urlMatch[1] : "",
    text: textMatch || "",
  };
}

// buildHtmlLink.ts
export const buildHtmlLink = (url: string, label?: string) => {
  const labelOrUrl = label?.trim() || url;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: blue;">${labelOrUrl}</a>`;
};
