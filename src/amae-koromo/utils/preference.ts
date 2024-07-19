import Conf from "./conf.js";

export function loadPlayerPreference<T>(key: string, id: string, defaultValue: T): T {
  try {
    return JSON.parse(localStorage.getItem(`${key}${Conf.canonicalDomain}${id}`) || "") ?? defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export function loadPreference<T>(key: string, defaultValue: T): T {
  return loadPlayerPreference(key, "GLOBAL", defaultValue);
}