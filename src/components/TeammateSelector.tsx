'use client'

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal
  } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

import { ChevronsUpDown, Check, MoreHorizontal, Edit, Trash2, Plus, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function TeammateSelector() {
    const { teammates, activeTeammate, setActiveTeammate, createTeammate, renameTeammate, deleteTeammate, loading, initializing } = useProject();
    const [isCreateOpen, setCreateOpen] = React.useState(false);
    const [isEditOpen, setEditOpen] = React.useState(false);
    const [isDeleteOpen, setDeleteOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [deletePassword, setDeletePassword] = React.useState('');
    const [teammateToEdit, setTeammateToEdit] = React.useState<typeof activeTeammate>(null);

    const { toast } = useToast();
    
    React.useEffect(() => {
        if(teammateToEdit && isEditOpen) {
            setNewName(teammateToEdit.name);
        } else {
            setNewName('');
        }
    }, [teammateToEdit, isEditOpen]);

    const handleCreate = () => {
        if(!newName.trim()) {
            toast({ title: 'Error', description: 'Teammate name cannot be empty.', variant: 'destructive'});
            return;
        }
        createTeammate(newName.trim());
        setNewName('');
        setCreateOpen(false);
    }
    
    const handleRename = () => {
        if (!teammateToEdit || !newName.trim()) {
            toast({ title: 'Error', description: 'Teammate name cannot be empty.', variant: 'destructive'});
            return;
        }
        renameTeammate(teammateToEdit.id, newName.trim());
        setEditOpen(false);
        setTeammateToEdit(null);
    }

    const handleDelete = () => {
        if (deletePassword !== 'MonkXWdn@2025') {
            toast({ title: 'Error', description: 'Incorrect password.', variant: 'destructive'});
            return;
        }
        if (activeTeammate) {
            deleteTeammate(activeTeammate.id);
        }
        setDeletePassword('');
        setDeleteOpen(false);
    }
    
    if (teammates.length === 0 && !initializing && !activeTeammate) {
        return (
            <>
                 <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Teammate Profile
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Your First Teammate Profile</DialogTitle>
                            <DialogDescription>
                                Teammate profiles help you organize your projects (e.g., "Work", "Personal").
                            </DialogDescription>
                        </DialogHeader>
                        <div>
                            <Label htmlFor='new-teammate-name'>Teammate Name</Label>
                            <Input id='new-teammate-name' value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Jane Doe"/>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-[200px] justify-between"
                >
                    <Users className="mr-2 h-4 w-4 shrink-0" />
                    {activeTeammate ? activeTeammate.name : "Select Teammate"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[250px]">
                    {teammates.map((teammate) => (
                        <DropdownMenuItem
                            key={teammate.id}
                            onSelect={() => {
                                const newTeammate = teammates.find(a => a.id === teammate.id) || null;
                                setActiveTeammate(newTeammate);
                            }}
                        >
                            <Check
                                className={cn(
                                    'mr-2 h-4 w-4',
                                    activeTeammate?.id === teammate.id ? 'opacity-100' : 'opacity-0'
                                )}
                            />
                            {teammate.name}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create New Teammate
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Edit className="mr-2 h-4 w-4" />
                            Rename Teammate
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                             <DropdownMenuSubContent>
                                {teammates.map(teammate => (
                                    <DropdownMenuItem key={teammate.id} onSelect={() => { setTeammateToEdit(teammate); setEditOpen(true);}}>
                                        {teammate.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive" disabled={!activeTeammate}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Current Teammate
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Teammate</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='new-teammate-name-dialog'>Teammate Name</Label>
                        <Input id='new-teammate-name-dialog' value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., John Doe"/>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Teammate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => { setEditOpen(open); if(!open) setTeammateToEdit(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Teammate &quot;{teammateToEdit?.name}&quot;</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='rename-teammate-name'>New Teammate Name</Label>
                        <Input id='rename-teammate-name' value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setEditOpen(false); setTeammateToEdit(null);}}>Cancel</Button>
                        <Button onClick={handleRename} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this teammate profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{activeTeammate?.name}" profile and all its projects. This action cannot be undone. Please enter the password to confirm.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                        <Label htmlFor="delete-password">Password</Label>
                        <Input id="delete-password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive hover:bg-destructive/90">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
