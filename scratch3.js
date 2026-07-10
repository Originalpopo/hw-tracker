async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
  const res = await fetch(url);
  const text = await res.text();
  
  // Try to find the structure that holds "การเงินและการบัญชี"
  // It is in the "docs-tdc" but that's for templates.
  // For normal sheets, it's in the initial data block.
  // The tab name often appears in a span: <span class="docs-sheet-tab-name">การเงินและการบัญชี</span>
  // Let's check if the HTML contains docs-sheet-tab-name
  const tabNameMatches = text.match(/<span class="docs-sheet-tab-name"[^>]*>([^<]+)<\/span>/g);
  if (tabNameMatches) {
     console.log("Tab names found in spans:", tabNameMatches.slice(0, 5));
  } else {
     console.log("No docs-sheet-tab-name found");
  }

  // Let's also look for `[gid, "Tab Name"]` in the JS block again but more broadly.
  // Google Sheets initializes the app with a massive JSON array.
  // Typically, `[1507742813,"Class Data",1,"",...`
  // We can search for `\[(\d+),"([^"]+)",\d+,""`
  const jsMatch = text.match(/\[(\d+),"([^"]+)",\d+,/g);
  if (jsMatch) {
     console.log("Found in JS:", jsMatch.slice(0, 5));
  }
}
test();
