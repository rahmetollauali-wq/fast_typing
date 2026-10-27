// localStorage может быть недоступен (приватный режим) — не падаем.
export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(`ft:${key}`);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (value === null || value === undefined) localStorage.removeItem(`ft:${key}`);
      else localStorage.setItem(`ft:${key}`, value);
    } catch {
      /* ignore */
    }
  },
  getJSON(key, fallback = null) {
    try {
      const v = this.get(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  setJSON(key, value) {
    this.set(key, value === null ? null : JSON.stringify(value));
  },
};
