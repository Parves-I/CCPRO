'use client';

import * as React from 'react';
import { format } from 'date-fns';
import type { Post, PostStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { InstagramIcon, YouTubeIcon, LinkedInIcon, FacebookIcon, WebsiteIcon, OtherPlatformIcon } from './icons';
import { PostDetailsModal } from './PostDetailsModal';
import { Badge } from './ui/badge';
import { useProject } from '@/context/ProjectContext';


interface CalendarDayProps {
  day: Date;
  isCurrentMonth: boolean;
  post: Post | undefined;
  isFilteredOut?: boolean;
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


export function CalendarDay({ day, post, isCurrentMonth, isFilteredOut }: CalendarDayProps) {
    const { movePost } = useProject();
    const [isModalOpen, setModalOpen] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const dateString = format(day, 'yyyy-MM-dd');

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (!post) return;
      setIsDragging(true);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dateString);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); // Necessary to allow dropping
      if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = () => {
      setIsDragOver(false);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const sourceDate = e.dataTransfer.getData('text/plain');
      if (sourceDate && sourceDate !== dateString) {
        movePost(sourceDate, dateString);
      }
    };
    
    const handleClick = () => {
      // Prevent opening modal when drag operation is finishing.
      if (!isDragging) {
        setModalOpen(true);
      }
    }


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
        draggable={!!post && !isFilteredOut}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative calendar-day bg-card border p-2 flex flex-col cursor-pointer transition-all duration-300 ease-in-out rounded-lg min-h-[150px] shadow-sm',
          !isCurrentMonth && 'bg-muted/50 opacity-60 pointer-events-none',
          post && !isFilteredOut ? 'hover:shadow-lg hover:-translate-y-1' : 'hover:bg-accent',
          isDragging && 'opacity-40 ring-2 ring-primary ring-offset-2 scale-95',
          isDragOver && 'ring-2 ring-primary bg-primary/10',
          isFilteredOut && 'opacity-50 bg-muted/30'
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
                           {post.types.map(type => (
                                <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                           ))}
                        </div>
                        <p className="font-semibold text-sm text-foreground break-words leading-tight">{post.title}</p>
                    </div>
                    <div className="flex items-center justify-end mt-auto pt-2 -space-x-2 flex-wrap">
                        {post.platforms.map((platform, index) => (
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
