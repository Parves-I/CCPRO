'use client';

import * as React from 'react';
import { format } from 'date-fns';
import type { Post, PostStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { InstagramIcon, YouTubeIcon, LinkedInIcon, FacebookIcon, WebsiteIcon, OtherPlatformIcon } from './icons';
import { PostDetailsModal } from './PostDetailsModal';
import { Badge } from './ui/badge';

interface CalendarDayProps {
  day: Date;
  isCurrentMonth: boolean;
  post: Post | undefined;
}

const platformIconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    Instagram: InstagramIcon,
    YouTube: YouTubeIcon,
    LinkedIn: LinkedInIcon,
    Facebook: FacebookIcon,
    Website: WebsiteIcon,
    Other: OtherPlatformIcon,
};

const statusColorMap: Record<PostStatus, string> = {
    Planned: 'bg-gray-400',
    'On Approval': 'bg-yellow-500',
    Scheduled: 'bg-blue-500',
    Posted: 'bg-green-500',
    Edited: 'bg-purple-500'
};


export function CalendarDay({ day, post, isCurrentMonth }: CalendarDayProps) {
    const [isModalOpen, setModalOpen] = React.useState(false);
    const dateString = format(day, 'yyyy-MM-dd');

    const PlatformIcon = ({ platform }: { platform: string }) => {
        const IconComponent = platformIconMap[platform] || OtherPlatformIcon;
        return (
             <div className="w-7 h-7 bg-card rounded-full border-2 border-background flex items-center justify-center shadow-sm">
                 <IconComponent className="w-full h-full p-1" />
             </div>
        );
    }
    
  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={cn(
          'relative calendar-day bg-card border p-2 flex flex-col cursor-pointer transition-all duration-300 ease-in-out rounded-lg min-h-[150px] shadow-sm',
          !isCurrentMonth && 'bg-muted/50 opacity-60 pointer-events-none',
          post ? 'hover:shadow-lg hover:-translate-y-1' : 'hover:bg-accent'
        )}
        style={{
            borderLeft: `5px solid ${post?.color === 'transparent' ? 'hsl(var(--border))' : post?.color}`,
        }}
      >
        <div className="flex justify-between items-start">
            {post?.status && (
                <div className='flex items-center gap-1.5'>
                    <div className={cn("w-2.5 h-2.5 rounded-full", statusColorMap[post.status])} />
                    <span className='text-xs text-muted-foreground font-medium'>{post.status}</span>
                </div>
            )}
            <div className="font-bold text-gray-700 text-right text-sm ml-auto">{format(day, 'd')}</div>
        </div>

        <div className="day-content flex-grow flex flex-col justify-between mt-1 text-xs">
            {post ? (
                <>
                    <div>
                        <div className="flex flex-wrap gap-1 mb-2">
                           {post.types.slice(0, 2).map(type => (
                                <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                           ))}
                        </div>
                        <p className="font-semibold text-sm text-foreground break-words leading-tight">{post.title}</p>
                    </div>
                    <div className="flex items-center justify-end mt-auto pt-2 -space-x-2">
                        {post.platforms.slice(0, 3).map((platform, index) => (
                           <PlatformIcon key={`${platform}-${index}`} platform={platform}/>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex-grow" />
            )}
        </div>
      </div>
      <PostDetailsModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        date={dateString}
        post={post}
      />
    </>
  );
}
