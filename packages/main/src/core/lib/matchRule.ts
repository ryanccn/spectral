import type { MojangOS, Rule } from '@core/install/types';

export const checkOS = (expected: MojangOS): boolean => {
  const os = process.platform;
  if (os === 'win32') {
    return expected === 'windows';
  } else if (os === 'darwin') {
    return expected === 'osx' || expected === 'macos';
  } else if (os === 'linux') {
    return expected === 'linux';
  }

  return false;
};

export const matchRule = (rules: Rule[]): boolean => {
  let ret: boolean = true;
  let matchedAny = false;

  for (const rule of rules) {
    if (rule.os) {
      if (rule.os.name) {
        if (checkOS(rule.os.name)) {
          // console.log('matched', rule);
          ret = ret && rule.action === 'allow';
          matchedAny = true;
        }
      }

      if (rule.os.arch === 'x64' && process.arch === 'x64') {
        ret = ret && rule.action === 'allow';
        matchedAny = true;
      }
    } else if (rule.features) {
    } else {
      ret = ret && true;
      matchedAny = true;
    }
  }

  return !matchedAny ? false : ret;
};
