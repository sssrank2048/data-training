import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { caseFile } from '../dist/reference/air-france/assets/case-source.mjs';

const directory = new URL('../data/private/', import.meta.url);
const destination = new URL(caseFile.filename, directory);
const matches = bytes => bytes.length === caseFile.bytes && createHash('sha256').update(bytes).digest('hex') === caseFile.sha256;
let existing;
try { existing = await readFile(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing && matches(existing)) {
  console.log(`已下载并校验：${caseFile.filename}，${existing.length} 字节，SHA-256 一致。`);
} else {
  if (existing) throw Error('本地文件与已核验镜像不同，保留原件，不覆盖。请先核对来源。');
  const response = await fetch(caseFile.url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`下载失败：HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!matches(bytes)) throw Error('下载内容与已核验镜像不一致；未保存，不使用替代数据。');
  await mkdir(directory, { recursive: true });
  const temporary = new URL(caseFile.filename + '.partial', directory);
  try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, destination); }
  finally { await rm(temporary, { force: true }); }
  console.log(`已下载完整工作簿：${caseFile.filename}，${bytes.length} 字节，SHA-256 已核验。`);
}
console.log('来源：公开仓库镜像；尚未与出版方 KEL321 文件逐字节核验。');
