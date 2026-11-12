export function waNumber(raw: string): string {
  let n = (raw ?? "").trim().replace(/[\s\-().]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("00")) n = n.slice(2);
  if (/^01\d{9}$/.test(n)) n = "880" + n.slice(1);
  else if (/^1\d{9}$/.test(n)) n = "880" + n;
  return n;
}