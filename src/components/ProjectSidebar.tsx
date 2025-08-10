'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ProjectSidebar() {
  const { projects, activeProject, setActiveProject, createProject, updateProject, deleteProject, loading } = useProject();
  const [isCreateOpen, setCreateOpen] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');

  const handleCreateProject = async () => {
    await createProject(newProjectName);
    setNewProjectName('');
    setCreateOpen(false);
  };
  
  return (
    <div className="h-full flex flex-col">
       <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <div className="p-2">
            <Button className="w-full" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Project Name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={loading || !newProjectName.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ScrollArea className="flex-grow">
        <div className="p-2 space-y-1">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              isActive={activeProject?.id === project.id}
              onSelect={() => setActiveProject(project)}
              onUpdate={updateProject}
              onDelete={deleteProject}
              isLoading={loading}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ProjectItem({ project, isActive, onSelect, onUpdate, onDelete, isLoading }: {
  project: { id: string, name: string },
  isActive: boolean,
  onSelect: () => void,
  onUpdate: (id: string, name: string) => void,
  onDelete: (id: string) => void,
  isLoading: boolean
}) {
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [name, setName] = React.useState(project.name);

  const handleUpdate = async () => {
    await onUpdate(project.id, name);
    setEditOpen(false);
  };

  return (
    <div
      className={cn(
        'group flex items-center justify-between p-2 text-sm rounded-md cursor-pointer hover:bg-muted',
        isActive ? 'bg-muted font-semibold' : ''
      )}
      onClick={onSelect}
    >
      <span className="truncate flex-1">{project.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className='text-destructive focus:text-destructive'>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isLoading || !name.trim()}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your project
                and remove your data from our servers.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(project.id)} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
