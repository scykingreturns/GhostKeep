'use client';

import { Platform, PLATFORMS } from '@/lib/platforms/types';
import PlatformIcon from './PlatformIcon';

type Props = {
  platform: Platform;
  size?: 'sm' | 'md';
};

export default function PlatformBadge({ platform, size = 'md' }: Props) {
  const config = PLATFORMS[platform];

  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: config.color }}
      >
        <PlatformIcon platform={platform} size={12} className="text-white [&_path]:fill-white" />
        {config.name}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
      style={{ backgroundColor: config.color }}
    >
      <PlatformIcon platform={platform} size={16} className="text-white [&_path]:fill-white" />
      {config.name}
    </span>
  );
}
