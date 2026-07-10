async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  const res = await fetch(url);
  const text = await res.text();
  
  // Title tag usually contains doc title
  const titleMatch = text.match(/<title>(.*?)<\/title>/);
  let docTitle = titleMatch ? titleMatch[1].replace(' - Google ชีต', '').replace(' - Google Sheets', '') : "Unknown";
  console.log("Doc Title:", docTitle);
  
  // GID match
  const gidMatch = url.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  
  // Find tab name mapping in HTML
  // Usually looks like: [gid,"Tab Name"] or something
  // In Google Sheets html, there's typically: { ..., "name": "Tab Name", ..., "gid": "0" } maybe?
  // Let's just find `[1507742813,"Class Data"]` or similar.
  // Actually, the structure is like: `["Class Data",1507742813]` or `[1507742813,"Class Data"]`
  // Let's regex for the gid.
  const escapedGid = gid;
  // Let's match around the gid
  const gidRegex = new RegExp(`.{0,30}${escapedGid}.{0,30}`, 'g');
  const matches = text.match(gidRegex);
  if (matches) {
     console.log("Context around GID:", matches.slice(0, 5));
  }
}
test();
