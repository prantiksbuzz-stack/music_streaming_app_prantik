// Turns dist-single/index.html into a page body for hosts that supply their own <html>/<head>/<body> skeleton.
import { readFileSync, writeFileSync } from 'node:fs';
const [, , input = 'dist-single/index.html', output = 'dist-single/positioning-desk.html'] = process.argv;
const html = readFileSync(input, 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
writeFileSync(output, keep.trim() + '\n' + body.trim() + '\n');
console.log('wrote', output, (Buffer.byteLength(keep + body) / 1024).toFixed(0) + ' KB');
