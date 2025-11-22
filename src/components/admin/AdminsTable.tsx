"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteDoc, doc } from 'firebase/firestore';
import AddAdminForm from './AddAdminForm';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type AdminItem = {
  id: string;
  name?: string;
  email?: string;
  nic?: string;
  phone?: string;
  position?: string;
  createdAt?: any;
};

export default function AdminsTable() {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs: AdminItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setAdmins(docs);
      setLoading(false);
    }, (err) => {
      console.error('admins snapshot', err);
      setError((err as Error)?.message ?? 'Failed to load admins');
      setLoading(false);
    });

    return () => { try { unsub(); } catch {} };
  }, []);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className='text-lg'>Admins</CardTitle>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>Add Admin</Button>
        </div>
      </CardHeader>
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="md:min-w-[60vw] md:min-h-[80vh] overflow-y-auto p-10 bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
            <DialogDescription>
              Create a new admin account. An invite email will be sent to the provided address.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <AddAdminForm onSuccess={() => setAddDialogOpen(false)} />
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
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <div className="flex justify-center items-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-3">Loading admins...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-red-500 py-6">
                    {error}
                  </TableCell>
                </TableRow>
              ) : admins.length > 0 ? (
                admins.map(a => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => { setSelectedAdmin(a); setDetailDialogOpen(true); }}>
                    <TableCell>{a.name ?? '—'}</TableCell>
                    <TableCell>{a.email ?? '—'}</TableCell>
                    <TableCell>{a.nic ?? '—'}</TableCell>
                    <TableCell>{a.phone ?? '—'}</TableCell>
                    <TableCell>{a.position ?? '—'}</TableCell>
                    <TableCell className="text-right">{
                      (() => {
                        try {
                          if (!a.createdAt) return '—';
                          if (typeof a.createdAt === 'string') return format(new Date(a.createdAt), 'Pp');
                          if (a.createdAt && typeof a.createdAt.toDate === 'function') return format(a.createdAt.toDate(), 'Pp');
                          return format(new Date(a.createdAt), 'Pp');
                        } catch (e) {
                          return '—';
                        }
                      })()
                    }</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No admins found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {/* Admin details dialog - opened when a row is clicked */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { if (!open) setSelectedAdmin(null); setDetailDialogOpen(open); }}>
        <DialogContent className="md:min-w-[60vw] md:min-h-[80vh] overflow-y-auto p-10 bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Admin details</DialogTitle>
          </DialogHeader>
          <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{selectedAdmin?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{selectedAdmin?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">NIC</div>
              <div className="font-medium">{selectedAdmin?.nic ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">{selectedAdmin?.phone ?? '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Position</div>
              <div className="font-medium">{selectedAdmin?.position ?? '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">{
                (() => {
                  try {
                    const a = selectedAdmin;
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
                if (!selectedAdmin) return;
                setConfirmOpen(true);
              }} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete admin'}</Button>
            </div>
        </DialogContent>
      </Dialog>
        
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => setConfirmOpen(v)}
        title="Delete this admin?"
        description="This cannot be undone. The admin account will be permanently removed."
        confirmLabel="Delete"
        loading={confirmLoading}
        onConfirm={async () => {
          if (!selectedAdmin) return;
          setConfirmLoading(true);
          try {
            await deleteDoc(doc(db, 'admins', selectedAdmin.id));
            toast({ title: 'Deleted', description: 'Admin deleted.' });
            setDetailDialogOpen(false);
            setSelectedAdmin(null);
          } catch (err) {
            console.error('Delete admin failed', err);
            toast({ title: 'Failed', description: 'Could not delete admin.' });
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </Card>
  );
}
