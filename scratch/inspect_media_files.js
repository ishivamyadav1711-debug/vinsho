import fs from 'node:fs';
import path from 'node:path';

const media1Path = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\7bf9c3f9-c097-4cec-a226-1f2fe55c0492\\media__1788759492186.jpg';
const media2Path = 'C:\\Users\\udayb\\.gemini\\antigravity-ide\\brain\\7bf9c3f9-c097-4cec-a226-1f2fe55c0492\\media__1788759496225.jpg';

console.log('Media 1 exists:', fs.existsSync(media1Path), 'size:', fs.statSync(media1Path).size);
console.log('Media 2 exists:', fs.existsSync(media2Path), 'size:', fs.statSync(media2Path).size);

// Read image dimensions if JPEG header can be parsed
function getJpegSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  let i = 0;
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;
  i += 2;
  while (i < buffer.length) {
    const marker = buffer[i + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    const length = buffer.readUInt16BE(i + 2);
    i += 2 + length;
  }
  return null;
}

console.log('Media 1 dimensions:', getJpegSize(media1Path));
console.log('Media 2 dimensions:', getJpegSize(media2Path));
