'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { Button } from './ui/button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { setActiveTeammate } = useProject();

  const handleChangeUser = () => {
    // By setting the active teammate to null, we trigger the selection modal on the main page.
    setActiveTeammate(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Settings className="h-6 w-6" />
            Application Settings
          </DialogTitle>
          <DialogDescription>
            Customize your CollabCal experience.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">User</h3>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <p className="text-base font-medium">
                  Switch Teammate
                </p>
                <p className="text-sm text-muted-foreground">
                  Log in as a different teammate.
                </p>
              </div>
              <Button variant="outline" onClick={handleChangeUser}>
                Change User
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
