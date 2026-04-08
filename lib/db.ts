import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const file = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filename: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// ─── Credentials ─────────────────────────────────────────────────────────────

type CredentialMap = Record<string, { client_id: string; client_secret: string }>;

export const credentialsDb = {
  get(platform: string) {
    const map = readJson<CredentialMap>('credentials.json', {});
    return map[platform] ?? null;
  },
  save(platform: string, clientId: string, clientSecret: string) {
    const map = readJson<CredentialMap>('credentials.json', {});
    map[platform] = { client_id: clientId, client_secret: clientSecret };
    writeJson('credentials.json', map);
  },
  delete(platform: string) {
    const map = readJson<CredentialMap>('credentials.json', {});
    delete map[platform];
    writeJson('credentials.json', map);
  },
  has(platform: string) {
    return !!this.get(platform);
  },
};

// ─── Platform Connections ─────────────────────────────────────────────────────

export type PlatformConnection = {
  id: string;
  platform: string;
  account_name: string;
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: number | null;
  avatar_url: string | null;
  connected_at: number;
};

export const connectionsDb = {
  getAll(): PlatformConnection[] {
    return readJson<PlatformConnection[]>('connections.json', []);
  },
  getByPlatform(platform: string): PlatformConnection[] {
    return this.getAll().filter(c => c.platform === platform);
  },
  upsert(data: Omit<PlatformConnection, 'connected_at'>) {
    const all = this.getAll().filter(
      c => !(c.platform === data.platform && c.account_id === data.account_id)
    );
    all.push({ ...data, connected_at: Math.floor(Date.now() / 1000) });
    writeJson('connections.json', all);
  },
  delete(id: string) {
    writeJson('connections.json', this.getAll().filter(c => c.id !== id));
  },
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export type Post = {
  id: string;
  content: string;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at: number | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  media_urls: string[];
  title: string | null;
  tags: string[];
  platform_post_ids: Record<string, string>;
};

export const postsDb = {
  getAll(): Post[] {
    return readJson<Post[]>('posts.json', []).sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at) return a.scheduled_at - b.scheduled_at;
      return b.created_at - a.created_at;
    });
  },
  getById(id: string): Post | null {
    return this.getAll().find(p => p.id === id) ?? null;
  },
  getByDateRange(startTs: number, endTs: number): Post[] {
    return this.getAll().filter(
      p => p.scheduled_at !== null && p.scheduled_at >= startTs && p.scheduled_at <= endTs
    );
  },
  create(data: Omit<Post, 'created_at' | 'updated_at'>): Post {
    const now = Math.floor(Date.now() / 1000);
    const post: Post = { ...data, created_at: now, updated_at: now };
    const all = readJson<Post[]>('posts.json', []);
    all.push(post);
    writeJson('posts.json', all);
    return post;
  },
  update(id: string, data: Partial<Omit<Post, 'id' | 'created_at'>>): Post | null {
    const all = readJson<Post[]>('posts.json', []);
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data, updated_at: Math.floor(Date.now() / 1000) };
    writeJson('posts.json', all);
    return all[idx];
  },
  delete(id: string) {
    writeJson('posts.json', readJson<Post[]>('posts.json', []).filter(p => p.id !== id));
  },
};
