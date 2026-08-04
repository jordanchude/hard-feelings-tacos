import fs from 'node:fs';
import vm from 'node:vm';

export function loadBrowserScript(file) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window, Object, Set, Error });
  return { window };
}
