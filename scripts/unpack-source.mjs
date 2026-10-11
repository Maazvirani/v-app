import { inflateRawSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const archivePath = resolve(root, 'V-Agent-Builder-Free-Demo.zip');
const archive = await readFile(archivePath);
const eocdSignature = 0x06054b50;
let eocd = -1;
for (let i = archive.length - 22; i >= Math.max(0, archive.length - 65_557); i--) {
  if (archive.readUInt32LE(i) === eocdSignature) { eocd = i; break; }
}
if (eocd < 0) throw new Error('The V-Agent source ZIP is missing its directory record.');

const entryCount = archive.readUInt16LE(eocd + 10);
let cursor = archive.readUInt32LE(eocd + 16);
let extracted = 0;
const reservedRootFiles = new Set(['README.md', 'render.yaml']);
const excludedSegments = new Set(['.git', 'node_modules', 'dist', '.expo', '.expo-user', '.localprofile', '.npm-cache']);

for (let index = 0; index < entryCount; index++) {
  if (archive.readUInt32LE(cursor) !== 0x02014b50) throw new Error('The V-Agent source ZIP has an invalid directory entry.');
  const flags = archive.readUInt16LE(cursor + 8);
  const method = archive.readUInt16LE(cursor + 10);
  const compressedSize = archive.readUInt32LE(cursor + 20);
  const uncompressedSize = archive.readUInt32LE(cursor + 24);
  const nameLength = archive.readUInt16LE(cursor + 28);
  const extraLength = archive.readUInt16LE(cursor + 30);
  const commentLength = archive.readUInt16LE(cursor + 32);
  const localOffset = archive.readUInt32LE(cursor + 42);
  const entryName = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8').replaceAll('\\', '/');
  cursor += 46 + nameLength + extraLength + commentLength;

  if (!entryName || entryName.endsWith('/')) continue;
  const segments = entryName.split('/');
  if (segments.some(part => !part || part === '.' || part === '..' || excludedSegments.has(part))) continue;
  if (segments.some(part => part.toLowerCase().endsWith('.log') || part.toLowerCase().startsWith('.env'))) continue;
  if (segments.length === 1 && reservedRootFiles.has(segments[0])) continue;
  if (flags & 1) throw new Error(`Encrypted ZIP entry is not supported: ${entryName}`);

  const destination = resolve(root, ...segments);
  const insideRoot = relative(root, destination);
  if (isAbsolute(insideRoot) || insideRoot === '..' || insideRoot.startsWith(`..${sep}`)) {
    throw new Error(`Unsafe ZIP path rejected: ${entryName}`);
  }
  if (archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Invalid ZIP entry header: ${entryName}`);
  const localNameLength = archive.readUInt16LE(localOffset + 26);
  const localExtraLength = archive.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const compressed = archive.subarray(dataStart, dataStart + compressedSize);
  const content = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed, { maxOutputLength: Math.max(uncompressedSize, 1) }) : null;
  if (!content) throw new Error(`Unsupported ZIP compression method for ${entryName}: ${method}`);
  if (content.length !== uncompressedSize) throw new Error(`ZIP entry size check failed: ${entryName}`);

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
  extracted++;
}

if (extracted < 10) throw new Error(`Only ${extracted} project files were unpacked; refusing to continue.`);
console.log(`Unpacked ${extracted} V-Agent project files.`);

