'use client'

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

import { ChevronsUpDown, Check, MoreHorizontal, Edit, Trash2, Plus, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function AccountSelector() {
    const { accounts, activeAccount, setActiveAccount, createAccount, renameAccount, deleteAccount, loading } = useProject();
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [isCreateOpen, setCreateOpen] = React.useState(false);
    const [isEditOpen, setEditOpen] = React.useState(false);
    const [isDeleteOpen, setDeleteOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [deletePassword, setDeletePassword] = React.useState('');

    const { toast } = useToast();
    
    React.useEffect(() => {
        if(activeAccount && isEditOpen) {
            setNewName(activeAccount.name);
        }
    }, [activeAccount, isEditOpen]);

    const handleCreate = () => {
        if(!newName.trim()) {
            toast({ title: 'Error', description: 'Account name cannot be empty.', variant: 'destructive'});
            return;
        }
        createAccount(newName.trim());
        setNewName('');
        setCreateOpen(false);
    }
    
    const handleRename = () => {
        if (!activeAccount || !newName.trim()) {
            toast({ title: 'Error', description: 'Account name cannot be empty.', variant: 'destructive'});
            return;
        }
        renameAccount(activeAccount.id, newName.trim());
        setEditOpen(false);
    }

    const handleDelete = () => {
        if (deletePassword !== 'MonkXWdn@2025') {
            toast({ title: 'Error', description: 'Incorrect password.', variant: 'destructive'});
            return;
        }
        if (activeAccount) {
            deleteAccount(activeAccount.id);
        }
        setDeletePassword('');
        setDeleteOpen(false);
    }
    
    if (accounts.length === 0 && !loading) {
        return (
            <>
                 <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Account
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Your First Account</DialogTitle>
                            <DialogDescription>
                                Accounts help you organize your projects (e.g., "Work", "Personal").
                            </DialogDescription>
                        </DialogHeader>
                        <div>
                            <Label htmlFor='new-account-name'>Account Name</Label>
                            <Input id='new-account-name' value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Socials"/>
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-[200px] justify-between"
                    disabled={loading}
                >
                    <Users className="mr-2 h-4 w-4 shrink-0" />
                    {activeAccount ? activeAccount.name : "Select account"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                    <Command>
                        <CommandInput placeholder="Search accounts..." />
                        <CommandList>
                            <CommandEmpty>No accounts found.</CommandEmpty>
                            <CommandGroup>
                                {accounts.map((account) => (
                                <CommandItem
                                    key={account.id}
                                    value={account.name}
                                    onSelect={() => {
                                        const newAccount = accounts.find(a => a.id === account.id) || null;
                                        setActiveAccount(newAccount);
                                        setPopoverOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            activeAccount?.id === account.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    {account.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        <Button variant="ghost" className="w-full justify-start rounded-none border-t" onClick={() => { setCreateOpen(true); setPopoverOpen(false); }}>
                            <Plus className="mr-2 h-4 w-4" /> Create New Account
                        </Button>
                    </Command>
                </PopoverContent>
            </Popover>

            {activeAccount && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>}

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Account</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='new-account-name-dialog'>Account Name</Label>
                        <Input id='new-account-name-dialog' value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Marketing Team"/>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Account</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Account</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label htmlFor='rename-account-name'>Account Name</Label>
                        <Input id='rename-account-name' value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{activeAccount?.name}" account and all its projects. This action cannot be undone. Please enter the password to confirm.
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
