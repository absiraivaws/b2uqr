"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import AddStaffForm from './AddStaffForm';
import { useToast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type StaffItem = {
  id: string;
  name?: string;
  email?: string;
  nic?: string;
  phone?: string;
  address?: string;
  position?: string;
  createdAt?: any;
};

export default function StaffsTable() {
  const [staffs, setStaffs] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs: StaffItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setStaffs(docs);
      setLoading(false);
    }, (err) => {
      console.error('staff snapshot', err);
      setError((err as Error)?.message ?? 'Failed to load staff');
      setLoading(false);
    });

    return () => { try { unsub(); } catch {} };
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className='text-lg'>Staff</CardTitle>
          <Button onClick={() => setDialogOpen(true)}>Add Staff</Button>
        </div>
      </CardHeader>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="md:min-w-[60vw] md:min-h-[80vh] overflow-y-auto p-10 bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>Create a new staff member account.</DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <AddStaffForm onSuccess={() => setDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>NIC</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    <div className="flex justify-center items-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-3">Loading staff...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-red-500 py-6">
                    {error}
                  </TableCell>
                </TableRow>
              ) : staffs.length > 0 ? (
                staffs.map(s => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => { setSelectedStaff(s); setDetailDialogOpen(true); }}>
                    <TableCell>{s.name ?? '—'}</TableCell>
                    <TableCell>{s.email ?? '—'}</TableCell>
                    <TableCell>{s.nic ?? '—'}</TableCell>
                    <TableCell>{s.phone ?? '—'}</TableCell>
                    <TableCell>{s.address ?? '—'}</TableCell>
                    <TableCell>{s.position ?? '—'}</TableCell>
                    <TableCell className="text-right">{
                      (() => {
                        try {
                          if (!s.createdAt) return '—';
                          if (typeof s.createdAt === 'string') return format(new Date(s.createdAt), 'Pp');
                          if (s.createdAt && typeof s.createdAt.toDate === 'function') return format(s.createdAt.toDate(), 'Pp');
                          return format(new Date(s.createdAt), 'Pp');
                        } catch (e) {
                          return '—';
                        }
                      })()
                    }</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No staff found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {/* Staff details dialog - opened when a row is clicked */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { if (!open) setSelectedStaff(null); setDetailDialogOpen(open); }}>
        <DialogContent className="md:min-w-[60vw] md:min-h-[80vh] overflow-y-auto p-10 bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Staff details</DialogTitle>
          </DialogHeader>
          <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{selectedStaff?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{selectedStaff?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">NIC</div>
              <div className="font-medium">{selectedStaff?.nic ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">{selectedStaff?.phone ?? '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{selectedStaff?.address ?? '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Position</div>
              <div className="font-medium">{selectedStaff?.position ?? '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">{
                (() => {
                  try {
                    const a = selectedStaff;
                    if (!a?.createdAt) return '—';
                    if (typeof a.createdAt === 'string') return format(new Date(a.createdAt), 'Pp');
                    if (a.createdAt && typeof a.createdAt.toDate === 'function') return format(a.createdAt.toDate(), 'Pp');
                    return format(new Date(a.createdAt), 'Pp');
                  } catch (e) {
                    return '—';
                  }
                })()
              }</div>
            </div>
          </div>
          <div className="pt-6 flex justify-end space-x-2">
            <Button variant="destructive" onClick={(e) => {
              e.stopPropagation();
              if (!selectedStaff) return;
              setConfirmOpen(true);
            }} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete staff'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => setConfirmOpen(v)}
        title="Delete this staff?"
        description="This cannot be undone. The staff account will be permanently removed."
        confirmLabel="Delete"
        loading={confirmLoading}
        onConfirm={async () => {
          if (!selectedStaff) return;
          setConfirmLoading(true);
          try {
            await deleteDoc(doc(db, 'staff', selectedStaff.id));
            toast({ title: 'Deleted', description: 'Staff deleted.' });
            setDetailDialogOpen(false);
            setSelectedStaff(null);
          } catch (err) {
            console.error('Delete staff failed', err);
            toast({ title: 'Failed', description: 'Could not delete staff.' });
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </Card>
  );
}
