import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Shield, Loader2, UserCheck, UserX, Trash2, Crown, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'NORMAL' | 'VIP' | 'ADMIN';
  enabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface VipRequest {
  id: number;
  userId: number;
  username: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
  processedById: number | null;
  processedByUsername: string | null;
}

const AdminPanel = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [vipRequests, setVipRequests] = useState<VipRequest[]>([]);
  const [vipRequestsLoading, setVipRequestsLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VipRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchVipRequests();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user role');
      console.error(error);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(`User ${currentStatus ? 'disabled' : 'enabled'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
      console.error(error);
    }
  };

  const deleteUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    } finally {
      setDeleteUserId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500 hover:bg-red-600';
      case 'VIP':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const fetchVipRequests = async () => {
    try {
      setVipRequestsLoading(true);
      const response = await fetch('/api/admin/vip-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch VIP requests');
      }

      const data = await response.json();
      setVipRequests(data);
    } catch (error) {
      toast.error('Failed to load VIP requests');
      console.error(error);
    } finally {
      setVipRequestsLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const response = await fetch(`/api/admin/vip-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminNote: adminNote.trim() || undefined })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to approve request');
      }

      toast.success('VIP request approved successfully');
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNote("");
      fetchVipRequests();
      fetchUsers(); // Refresh users to see updated role
    } catch (error: any) {
      toast.error(error?.message || 'Failed to approve VIP request');
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const response = await fetch(`/api/admin/vip-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminNote: adminNote.trim() || undefined })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to reject request');
      }

      toast.success('VIP request rejected');
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNote("");
      fetchVipRequests();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reject VIP request');
    }
  };

  const openActionDialog = (request: VipRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNote("");
    setActionDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage user accounts, roles, and VIP requests</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="vip-requests">
              VIP Requests
              {vipRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <Badge className="ml-2 bg-yellow-500">
                  {vipRequests.filter(r => r.status === 'PENDING').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[120px]">Role</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell className="font-semibold">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NORMAL">
                              <Badge className="bg-gray-500">NORMAL</Badge>
                            </SelectItem>
                            <SelectItem value="VIP">
                              <Badge className="bg-yellow-500">VIP</Badge>
                            </SelectItem>
                            <SelectItem value="ADMIN">
                              <Badge className="bg-red-500">ADMIN</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.enabled ? 'default' : 'destructive'}
                          className={user.enabled ? 'bg-green-600' : ''}
                        >
                          {user.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.enabled)}
                            title={user.enabled ? 'Disable user' : 'Enable user'}
                          >
                            {user.enabled ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="vip-requests">
            {vipRequestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    VIP Requests ({vipRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Admin Note</TableHead>
                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vipRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            No VIP requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        vipRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.id}</TableCell>
                            <TableCell className="font-semibold">{request.username}</TableCell>
                            <TableCell className="text-muted-foreground">{request.email}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {request.reason || <span className="text-muted-foreground italic">No reason provided</span>}
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(request.requestedAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {request.processedAt ? (
                                <>
                                  {formatDate(request.processedAt)}
                                  {request.processedByUsername && (
                                    <div className="text-xs">by {request.processedByUsername}</div>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">
                              {request.adminNote || <span className="text-muted-foreground italic">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === 'PENDING' && (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openActionDialog(request, 'approve')}
                                    className="border-green-300 text-green-600 hover:bg-green-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openActionDialog(request, 'reject')}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All user data including tracked stocks will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUser(deleteUserId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* VIP Request Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} VIP Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `Approve VIP request for ${selectedRequest?.username}? The user will gain VIP access.`
                : `Reject VIP request for ${selectedRequest?.username}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Admin Note (Optional)
            </label>
            <Textarea
              placeholder="Add a note about this decision..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="min-h-24"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {adminNote.length}/500 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setSelectedRequest(null);
                setAdminNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={actionType === 'approve' ? handleApproveRequest : handleRejectRequest}
              className={actionType === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;

