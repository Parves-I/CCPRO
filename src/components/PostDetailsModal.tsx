'use client';
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/context/ProjectContext';
import type { Post, Platform, PostStatus } from '@/lib/types';
import { POST_TYPES, PLATFORMS, THEME_COLORS, POST_STATUSES } from '@/lib/types';
import { InstagramIcon, YouTubeIcon, LinkedInIcon, FacebookIcon, WebsiteIcon, OtherPlatformIcon } from './icons';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


interface PostDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  post: Post | undefined;
}

const platformIconMap: Record<Platform, React.FC<React.SVGProps<SVGSVGElement>>> = {
    Instagram: InstagramIcon,
    YouTube: YouTubeIcon,
    LinkedIn: LinkedInIcon,
    Facebook: FacebookIcon,
    Website: WebsiteIcon,
    Other: OtherPlatformIcon,
};

export function PostDetailsModal({ isOpen, onClose, date, post }: PostDetailsModalProps) {
  const { updatePost, deletePost, loading } = useProject();
  const { toast } = useToast();

  const [title, setTitle] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [selectedTypes, setSelectedTypes] = React.useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Set<string>>(new Set());
  const [otherPlatformName, setOtherPlatformName] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState(THEME_COLORS[0]);
  const [status, setStatus] = React.useState<PostStatus>('Planned');
  
  React.useEffect(() => {
    if (isOpen) {
      setTitle(post?.title || '');
      setNotes(post?.notes || '');
      setSelectedTypes(new Set(post?.types || []));
      setSelectedColor(post?.color || THEME_COLORS[0]);
      setStatus(post?.status || 'Planned');
      
      const initialPlatforms = new Set(post?.platforms.filter(p => PLATFORMS.includes(p as Platform)) || []);
      const otherPlatform = post?.platforms.find(p => !PLATFORMS.includes(p as Platform));
      if (otherPlatform) {
          initialPlatforms.add('Other');
          setOtherPlatformName(otherPlatform);
      } else {
          setOtherPlatformName('');
      }
      setSelectedPlatforms(initialPlatforms);

    }
  }, [isOpen, post]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(type)) {
            newSet.delete(type);
        } else {
            newSet.add(type);
        }
        return newSet;
    });
  }

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => {
        const newSet = new Set(prev);
        if (newSet.has(platform)) {
            newSet.delete(platform);
        } else {
            newSet.add(platform);
        }
        return newSet;
    })
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Title is required.', variant: 'destructive' });
      return;
    }

    const finalPlatforms = Array.from(selectedPlatforms).map(p => {
        if (p === 'Other') return otherPlatformName.trim() || 'Other';
        return p;
    }).filter(Boolean);

    if (finalPlatforms.length === 0) {
        toast({ title: 'Error', description: 'At least one platform is required.', variant: 'destructive' });
        return;
    }

    const newPost: Post = {
        title: title.trim(),
        notes,
        types: Array.from(selectedTypes) as Post['types'],
        platforms: finalPlatforms,
        color: selectedColor,
        status: status,
    };
    updatePost(date, newPost);
    toast({ title: "Post Saved", description: "Remember to save the project to persist changes."});
    onClose();
  };

  const handleDelete = () => {
    deletePost(date);
    toast({ title: "Post Deleted", description: "Remember to save the project to persist changes."});
    onClose();
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-8">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl font-bold">Plan your Content</DialogTitle>
            {post && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This will remove the post from this day. This action cannot be undone until you save the project.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>Delete Post</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="post-title">Title</Label>
                        <Input id="post-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Q3 Product Showcase" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Theme Color</Label>
                            <div id="color-picker" className="flex gap-2 mt-2">
                            {THEME_COLORS.map(color => (
                                <div key={color}
                                        className={cn("color-swatch w-8 h-8 rounded-full transition-transform ease-in-out cursor-pointer",
                                        "hover:scale-110",
                                        color === 'transparent' ? 'border-2 border-dashed border-gray-300' : '',
                                        selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setSelectedColor(color)}
                                    />
                            ))}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="post-status">Status</Label>
                            <Select value={status} onValueChange={(value: PostStatus) => setStatus(value)}>
                                <SelectTrigger id="post-status" className='mt-1'>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {POST_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="post-notes">Notes / Content</Label>
                        <Textarea id="post-notes" rows={8} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add copy, links, hashtags, etc."/>
                    </div>
                </div>
                 <div className="space-y-4">
                    <div>
                        <Label>Type of Post (Select many)</Label>
                        <div className='flex flex-wrap gap-2 mt-2'>
                            {POST_TYPES.map(type => (
                                <Button key={type} variant={selectedTypes.has(type) ? 'default' : 'secondary'} onClick={() => handleTypeToggle(type)} className="rounded-full">
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label>Platform (Select many)</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-center mt-2">
                            {PLATFORMS.map(platform => {
                                const Icon = platformIconMap[platform];
                                const isSelected = selectedPlatforms.has(platform);
                                return (
                                <div key={platform} className="cursor-pointer" onClick={() => handlePlatformToggle(platform)}>
                                    <div className={cn(
                                        "w-12 h-12 mx-auto p-1 rounded-full border-2 transition-all ease-in-out",
                                        isSelected ? "border-primary scale-105" : "border-transparent",
                                    )}>
                                        <Icon className="text-muted-foreground"/>
                                    </div>
                                    <span className="text-xs mt-1">{platform}</span>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                    {selectedPlatforms.has('Other') && (
                        <div>
                            <Label htmlFor="other-platform-name">Other Platform Name</Label>
                            <Input id="other-platform-name" value={otherPlatformName} onChange={e => setOtherPlatformName(e.target.value)} placeholder="e.g., TikTok, Threads"/>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Save Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
