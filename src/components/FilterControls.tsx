'use client';

import * as React from 'react';
import { useProject } from '@/context/ProjectContext';
import { POST_STATUSES, POST_TYPES, PLATFORMS } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { Badge } from './ui/badge';

export function FilterControls() {
  const { filters, setFilters, activeProjectData } = useProject();

  if (!activeProjectData || !activeProjectData.startDate) {
    return null;
  }
  
  const handleFilterChange = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilterSet = new Set(prev[category]);
      if (newFilterSet.has(value)) {
        newFilterSet.delete(value);
      } else {
        newFilterSet.add(value);
      }
      return { ...prev, [category]: Array.from(newFilterSet) };
    });
  };

  const clearFilters = () => {
    setFilters({ status: [], types: [], platforms: [] });
  };

  const activeFilterCount = filters.status.length + filters.types.length + filters.platforms.length;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {POST_STATUSES.map(status => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.status.includes(status)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => handleFilterChange('status', status)}
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuLabel className="mt-2">Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {POST_TYPES.map(type => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={filters.types.includes(type)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => handleFilterChange('types', type)}
            >
              {type}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuLabel className="mt-2">Filter by Platform</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {[...PLATFORMS].map(platform => (
             <DropdownMenuCheckboxItem
                key={platform}
                checked={filters.platforms.includes(platform)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => handleFilterChange('platforms', platform)}
            >
                {platform}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {activeFilterCount > 0 && (
        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
