const fs = require('fs');

const html = fs.readFileSync('sheet.html', 'utf8');

// In Google Sheets HTML, there is usually a list of sheets like this:
// { "1": "SheetName", "2": gid, ... } or ["SheetName", gid]
// Let's find all occurrences of strings followed by large numbers that look like GIDs.
// Actually, let's search for "name" and "gid" if they exist.
let match = html.match(/"name":"([^"]+)".*?"gid":"?(\d+)"?/g);
if (match) {
  console.log('Found with name/gid:', match);
} else {
  // Try another common pattern: ["SheetName", gid]
  const regex = /\["([^"]+)",(\d+)\]/g;
  let m;
  console.log('Trying array pattern:');
  while ((m = regex.exec(html)) !== null) {
    if (m[1].length > 0 && m[1].length < 30) {
      console.log(`Name: ${m[1]}, GID: ${m[2]}`);
    }
  }
}
