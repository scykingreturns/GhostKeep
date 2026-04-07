import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'ghostkeep.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_app_credentials (
      platform TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS platform_connections (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at INTEGER,
      avatar_url TEXT,
      connected_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(platform, account_id)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      platforms TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at INTEGER,
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      media_urls TEXT,
      title TEXT,
      tags TEXT,
      platform_post_ids TEXT
    );

    CREATE TABLE IF NOT EXISTS post_platform_results (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      status TEXT NOT NULL,
      platform_post_id TEXT,
      error_message TEXT,
      published_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

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

type RawPost = {
  id: string;
  content: string;
  platforms: string;
  status: string;
  scheduled_at: number | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  media_urls: string | null;
  title: string | null;
  tags: string | null;
  platform_post_ids: string | null;
};

function deserializePost(row: RawPost): Post {
  return {
    ...row,
    platforms: JSON.parse(row.platforms || '[]'),
    media_urls: JSON.parse(row.media_urls || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    platform_post_ids: JSON.parse(row.platform_post_ids || '{}'),
    status: row.status as Post['status'],
  };
}

export const postsDb = {
  getAll(): Post[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM posts ORDER BY scheduled_at ASC, created_at DESC').all() as RawPost[];
    return rows.map(deserializePost);
  },

  getById(id: string): Post | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as RawPost | undefined;
    return row ? deserializePost(row) : null;
  },

  getByDateRange(startTs: number, endTs: number): Post[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM posts WHERE scheduled_at >= ? AND scheduled_at <= ? ORDER BY scheduled_at ASC'
    ).all(startTs, endTs) as RawPost[];
    return rows.map(deserializePost);
  },

  create(data: Omit<Post, 'created_at' | 'updated_at'>): Post {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO posts (id, content, platforms, status, scheduled_at, published_at, media_urls, title, tags, platform_post_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.content,
      JSON.stringify(data.platforms),
      data.status,
      data.scheduled_at,
      data.published_at,
      JSON.stringify(data.media_urls),
      data.title,
      JSON.stringify(data.tags),
      JSON.stringify(data.platform_post_ids),
      now,
      now
    );
    return this.getById(data.id)!;
  },

  update(id: string, data: Partial<Omit<Post, 'id' | 'created_at'>>): Post | null {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (data.content !== undefined) { sets.push('content = ?'); values.push(data.content); }
    if (data.platforms !== undefined) { sets.push('platforms = ?'); values.push(JSON.stringify(data.platforms)); }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    if (data.scheduled_at !== undefined) { sets.push('scheduled_at = ?'); values.push(data.scheduled_at); }
    if (data.published_at !== undefined) { sets.push('published_at = ?'); values.push(data.published_at); }
    if (data.media_urls !== undefined) { sets.push('media_urls = ?'); values.push(JSON.stringify(data.media_urls)); }
    if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title); }
    if (data.tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.platform_post_ids !== undefined) { sets.push('platform_post_ids = ?'); values.push(JSON.stringify(data.platform_post_ids)); }

    values.push(id);
    db.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  },
};

export const connectionsDb = {
  getAll(): PlatformConnection[] {
    const db = getDb();
    return db.prepare('SELECT * FROM platform_connections ORDER BY platform ASC').all() as PlatformConnection[];
  },

  getByPlatform(platform: string): PlatformConnection[] {
    const db = getDb();
    return db.prepare('SELECT * FROM platform_connections WHERE platform = ?').all(platform) as PlatformConnection[];
  },

  upsert(data: Omit<PlatformConnection, 'connected_at'>): PlatformConnection {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO platform_connections (id, platform, account_name, account_id, access_token, refresh_token, token_expires_at, avatar_url, connected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(platform, account_id) DO UPDATE SET
        account_name = excluded.account_name,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at,
        avatar_url = excluded.avatar_url
    `).run(data.id, data.platform, data.account_name, data.account_id, data.access_token, data.refresh_token, data.token_expires_at, data.avatar_url, now);
    return db.prepare('SELECT * FROM platform_connections WHERE id = ?').get(data.id) as PlatformConnection;
  },

  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM platform_connections WHERE id = ?').run(id);
  },
};

export type OAuthAppCredentials = {
  platform: string;
  client_id: string;
  client_secret: string;
  created_at: number;
  updated_at: number;
};

export const credentialsDb = {
  get(platform: string): OAuthAppCredentials | null {
    const db = getDb();
    return db.prepare('SELECT * FROM oauth_app_credentials WHERE platform = ?').get(platform) as OAuthAppCredentials | null;
  },

  getAll(): OAuthAppCredentials[] {
    const db = getDb();
    return db.prepare('SELECT * FROM oauth_app_credentials').all() as OAuthAppCredentials[];
  },

  save(platform: string, clientId: string, clientSecret: string): void {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO oauth_app_credentials (platform, client_id, client_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(platform) DO UPDATE SET
        client_id = excluded.client_id,
        client_secret = excluded.client_secret,
        updated_at = excluded.updated_at
    `).run(platform, clientId, clientSecret, now, now);
  },

  delete(platform: string): void {
    const db = getDb();
    db.prepare('DELETE FROM oauth_app_credentials WHERE platform = ?').run(platform);
  },

  has(platform: string): boolean {
    return this.get(platform) !== null;
  },
};

export default getDb;
