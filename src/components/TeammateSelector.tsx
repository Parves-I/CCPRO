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

import { ChevronsUpDown, Check, MoreHorizontal, Edit, Trash2, Plus, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TeammateSelectorProps {
    isPrimary?: boolean;
}

export function TeammateSelector({ isPrimary = false }: TeammateSelectorProps) {
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
            toast({ title: 'Error', description: 'Name required.', variant: 'destructive'});
            return;
        }
        createTeammate(newName.trim());
        setNewName('');
        setCreateOpen(false);
    }
    
    const handleRename = () => {
        if (!teammateToEdit || !newName.trim()) {
            toast({ title: 'Error', description: 'Name required.', variant: 'destructive'});
            return;
        }
        renameTeammate(teammateToEdit.id, newName.trim());
        setEditOpen(false);
        setTeammateToEdit(null);
    }

    const handleDelete = () => {
        if (deletePassword !== 'MonkXWdn@2025') {
            toast({ title: 'Error', description: 'Wrong password.', variant: 'destructive'});
            return;
        }
        if (activeTeammate) {
            deleteTeammate(activeTeammate.id);
        }
        setDeletePassword('');
        setDeleteOpen(false);
    }
    
    if (isPrimary && teammates.length === 0 && !initializing && !activeTeammate) {
        return (
            <>
                 <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add User Profile
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add User Profile</DialogTitle>
                            <DialogDescription>
                                Set who is making changes.
                            </DialogDescription>
                        </DialogHeader>
                        <div>
                            <Label htmlFor='new-teammate-name'>Name</Label>
                            <Input id='new-teammate-name' value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Jane Doe"/>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add</Button>
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
                    <User className="mr-2 h-4 w-4 shrink-0" />
                    {activeTeammate ? activeTeammate.name : "Pick User"}
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
                        <Plus className="mr-2 h-4 w-4" /> Add New User
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Edit className="mr-2 h-4 w-4" />
                            Rename User
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
                        Delete User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='new-teammate-name-dialog'>Name</Label>
                        <Input id='new-teammate-name-dialog' value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., John Doe"/>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => { setEditOpen(open); if(!open) setTeammateToEdit(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename User &quot;{teammateToEdit?.name}&quot;</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='rename-teammate-name'>New Name</Label>
                        <Input id='rename-teammate-name' value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setEditOpen(false); setTeammateToEdit(null);}}>Cancel</Button>
                        <Button onClick={handleRename} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete user profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete "{activeTeammate?.name}". Type password to confirm.
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
