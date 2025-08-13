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
import { X, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';

export function FilterControls() {
  const { filters, setFilters, activeCalendar } = useProject();

  if (!activeCalendar || !activeCalendar.startDate) {
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

  const renderFilterCount = (filterList: string[]) => {
    if (filterList.length === 0) return null;
    return <Badge variant="secondary" className="ml-auto font-normal">{filterList.length}</Badge>
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className='text-muted-foreground'>
                    Status
                    {renderFilterCount(filters.status)}
                    <ChevronDown className="ml-2 h-4 w-4" />
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
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="outline" className='text-muted-foreground'>
                    Type
                    {renderFilterCount(filters.types)}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
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
            </DropdownMenuContent>
        </DropdownMenu>
      
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className='text-muted-foreground'>
                    Platform
                    {renderFilterCount(filters.platforms)}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
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
