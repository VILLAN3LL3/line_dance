import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

export const serverRoot = path.resolve(directory, import.meta.url.endsWith('.ts') ? '..' : '../..');
