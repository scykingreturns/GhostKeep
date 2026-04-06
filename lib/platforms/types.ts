export type Platform = 'linkedin' | 'twitter' | 'threads' | 'substack';

export type PlatformConfig = {
  id: Platform;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  maxChars: number;
  supportsImages: boolean;
  supportsScheduling: boolean;
  authUrl: string;
  scopes: string[];
};

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    bgColor: 'bg-[#0A66C2]',
    textColor: 'text-[#0A66C2]',
    icon: 'linkedin',
    maxChars: 3000,
    supportsImages: true,
    supportsScheduling: false,
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: ['openid', 'profile', 'w_member_social'],
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    color: '#000000',
    bgColor: 'bg-black',
    textColor: 'text-black',
    icon: 'twitter',
    maxChars: 280,
    supportsImages: true,
    supportsScheduling: false,
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    color: '#000000',
    bgColor: 'bg-black',
    textColor: 'text-black',
    icon: 'threads',
    maxChars: 500,
    supportsImages: true,
    supportsScheduling: false,
    authUrl: 'https://threads.net/oauth/authorize',
    scopes: ['threads_basic', 'threads_content_publish'],
  },
  substack: {
    id: 'substack',
    name: 'Substack',
    color: '#FF6719',
    bgColor: 'bg-[#FF6719]',
    textColor: 'text-[#FF6719]',
    icon: 'substack',
    maxChars: 100000,
    supportsImages: true,
    supportsScheduling: true,
    authUrl: '',
    scopes: [],
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);
