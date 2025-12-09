"use client";

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2, UserCog, Users, ChevronDown, ChevronUp, Phone, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BranchInfo } from './types';

type Props = {
  branch: BranchInfo;
  expanded: boolean;
  onToggle: () => void;
  onRequestDeleteBranch: (b: BranchInfo) => void;
  deletingBranchId?: string | null;
  onRequestDeleteCashier: (branchId: string, cashierId: string) => void;
  deletingCashierId?: string | null;
  onOpenManagerDialog: (b: BranchInfo) => void;
  onOpenCashierDialog: (b: BranchInfo) => void;
  onRequestRemoveManager: (b: BranchInfo) => void;
  removingManagerId?: string | null;
};

export default function BranchCard({ branch, expanded, onToggle, onRequestDeleteBranch, deletingBranchId, onRequestDeleteCashier, deletingCashierId, onOpenManagerDialog, onOpenCashierDialog, onRequestRemoveManager, removingManagerId }: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      setMeasuredHeight(0);
      return;
    }
    // measure after layout so we have accurate scrollHeight
    const height = el.scrollHeight;
    setMeasuredHeight(height);
  }, [branch, expanded]);

  return (
    <Card key={branch.id}>
      <CardHeader className={`flex flex-row cursor-pointer items-center ${expanded ? `mb-6` : ``}`} onClick={onToggle}>
        <div className="w-20 text-sm text-muted-foreground">
          {typeof branch.branchNumber === 'number' && branch.branchNumber > 0 ? (
            <span className="font-mono">#{branch.branchNumber}</span>
          ) : (
            <span className="font-mono">-</span>
          )}
        </div>

        <div className={expanded ? 'flex-1 text-2xl font-semibold' : 'flex-1 text-sm font-medium'}>{branch.name}</div>

        {!expanded && (
          <div className="flex-1 text-sm text-muted-foreground">{branch.managerName ?? '-'}</div>
        )}

        <div className="w-40 text-sm text-muted-foreground font-mono">{branch.username}</div>

        <div className="flex items-center ml-2">
          <Button variant="danger" size="icon" onClick={(e) => { e.stopPropagation(); onRequestDeleteBranch(branch); }} disabled={deletingBranchId === branch.id}>
            {deletingBranchId === branch.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
          </Button>
          <div className="ml-2">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      <CardContent
        ref={contentRef}
        className="space-y-6"
        style={{
          maxHeight: expanded ? `${measuredHeight}px` : '0px',
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 350ms cubic-bezier(0.2,0.8,0.2,1), opacity 250ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
        aria-hidden={!expanded}
      >
        <div className="flex flex-col md:flex-row items-start justify-between">
          {branch.managerName ? (
            <div className="grid grid-cols-3 gap-4 items-center w-full">
              <div className="col-span-1 text-lg font-medium truncate">{branch.managerName}</div>
              <div className="text-sm text-muted-foreground text-center truncate flex items-center justify-center">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{branch.managerContact?.phone ?? '-'}</span>
              </div>
              <div className="text-sm text-muted-foreground text-right truncate pr-6">
                <span className="inline-flex items-center justify-end">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{branch.managerContact?.email ?? '-'}</span>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No manager assigned</p>
          )}
          <div className="flex gap-2 ml-4">
            <Button size="sm" variant="outline" onClick={() => onOpenManagerDialog(branch)}>
              <UserCog className="mr-2 h-4 w-4" />
              {branch.managerName ? 'Update manager' : 'Assign manager'}
            </Button>
            {branch.managerName && (
              <Button variant="danger" size="icon" onClick={(e) => { e.stopPropagation(); onRequestRemoveManager(branch); }} disabled={removingManagerId === branch.id}>
                {removingManagerId === branch.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Cashiers</p>
              <p className="text-sm text-muted-foreground">{branch.cashiers.length} account(s)</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpenCashierDialog(branch)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add cashier
            </Button>
          </div>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branch.cashiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No cashiers yet.</TableCell>
                </TableRow>
              ) : branch.cashiers.map((cashier) => (
                <TableRow key={cashier.id}>
                  <TableCell className="font-mono text-sm">{cashier.username}</TableCell>
                  <TableCell>{cashier.displayName}</TableCell>
                  <TableCell>
                    <Badge variant={cashier.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{cashier.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="danger" size="sm" onClick={() => onRequestDeleteCashier(branch.id, cashier.id)}>
                      {deletingCashierId === cashier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
