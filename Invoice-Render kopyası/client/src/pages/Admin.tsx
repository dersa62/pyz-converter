import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Profile = { name: string; email: string; role: string };
type PdfItem = {
  id: number;
  fileName: string;
  invoiceNumber: string;
  createdAt: string;
};
type PendingUser = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};
type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};
type ChangeRequest = {
  id: number;
  userId: number;
  field: string;
  value: string;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export default function Admin() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("authToken")
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [passwordEdits, setPasswordEdits] = useState<Record<number, string>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loadProfile = async (authToken: string) => {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Profile load failed");
    const data = await res.json();
    setProfile(data);
  };

  const loadPdfs = async (authToken: string) => {
    const res = await fetch("/api/user/pdfs", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("PDF list failed");
    const data = await res.json();
    setPdfs(data);
  };

  const loadPendingUsers = async (authToken: string) => {
    const res = await fetch("/api/admin/pending-users", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Pending users failed");
    const data = await res.json();
    setPendingUsers(data);
  };

  const loadUsers = async (authToken: string) => {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Users load failed");
    const data = await res.json();
    setUsers(data);
  };

  const loadChangeRequests = async (authToken: string) => {
    const res = await fetch("/api/admin/change-requests?status=pending", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Change requests failed");
    const data = await res.json();
    setChangeRequests(data);
  };

  const updateUserField = (
    userId: number,
    field: keyof UserItem,
    value: string
  ) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, [field]: value } : user
      )
    );
  };

  const saveUser = async (user: UserItem) => {
    if (!token) return;
    const payload: Record<string, string> = {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    const password = passwordEdits[user.id];
    if (password) {
      payload.password = password;
    }

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Save failed");
    const updated = await res.json();
    setUsers((prev) =>
      prev.map((item) => (item.id === user.id ? updated : item))
    );
    setPasswordEdits((prev) => ({ ...prev, [user.id]: "" }));
    toast({
      title: "User updated",
      description: "Changes saved successfully.",
    });
  };

  const approveChangeRequest = async (requestId: number) => {
    if (!token) return;
    const res = await fetch(
      `/api/admin/change-requests/${requestId}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error("Approve failed");
    await loadChangeRequests(token);
    await loadUsers(token);
    toast({
      title: "Change approved",
      description: "User record updated.",
    });
  };

  const rejectChangeRequest = async (requestId: number) => {
    if (!token) return;
    const res = await fetch(
      `/api/admin/change-requests/${requestId}/reject`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error("Reject failed");
    await loadChangeRequests(token);
    toast({
      title: "Change rejected",
      description: "The request was rejected.",
    });
  };

  const approveUser = async (userId: number) => {
    if (!token) return;
    const res = await fetch("/api/admin/approve-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("Approve failed");
    await loadPendingUsers(token);
    toast({
      title: "User approved",
      description: "The account can now log in.",
    });
  };

  const rejectUser = async (userId: number) => {
    if (!token) return;
    const res = await fetch("/api/admin/reject-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error("Reject failed");
    await loadPendingUsers(token);
    toast({
      title: "User rejected",
      description: "The registration was removed.",
    });
  };

  const downloadPdf = async (id: number, fileName: string) => {
    if (!token) return;
    const res = await fetch(`/api/user/pdfs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setLocation("/");
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      loadProfile(token),
      loadPdfs(token),
      loadPendingUsers(token),
      loadUsers(token),
      loadChangeRequests(token),
    ])
      .catch(() => {
        toast({
          title: "Failed to load admin data",
          description: "Please login again.",
          variant: "destructive",
        });
        handleLogout();
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        userEmail={profile?.email}
        userName={profile?.name}
        userRole={profile?.role}
        onLogout={handleLogout}
      />

      <main className="flex-1 container mx-auto px-4 py-10 space-y-6">
        {!token ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>Please login on the home page.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLocation("/")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your profile and download previous PDFs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <input
                    className="w-full border p-2 rounded"
                    value={profile?.name ?? ""}
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <input
                    className="w-full border p-2 rounded"
                    value={profile?.email ?? ""}
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <input
                    className="w-full border p-2 rounded"
                    value={profile?.role ?? ""}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  Pending Registrations
                </div>
                {pendingUsers.length ? (
                  <div className="space-y-3">
                    {pendingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-slate-600">
                            {user.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              approveUser(user.id).catch(() => {
                                toast({
                                  title: "Approval failed",
                                  description: "Could not approve user.",
                                  variant: "destructive",
                                });
                              });
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              rejectUser(user.id).catch(() => {
                                toast({
                                  title: "Rejection failed",
                                  description: "Could not reject user.",
                                  variant: "destructive",
                                });
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    No pending registrations.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  Profile Change Requests
                </div>
                {changeRequests.length ? (
                  <div className="space-y-3">
                    {changeRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {req.userName} ({req.userEmail})
                        </div>
                        <div className="text-xs text-slate-500">
                          Field: {req.field.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500">
                          New Value:{" "}
                          {req.field === "password" ? "••••••••" : req.value}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              approveChangeRequest(req.id).catch(() =>
                                toast({
                                  title: "Approval failed",
                                  description: "Could not approve change.",
                                  variant: "destructive",
                                })
                              )
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              rejectChangeRequest(req.id).catch(() =>
                                toast({
                                  title: "Rejection failed",
                                  description: "Could not reject change.",
                                  variant: "destructive",
                                })
                              )
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    No pending change requests.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  User Management
                </div>
                {users.length ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="rounded-lg border p-4 space-y-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Full Name</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={user.name}
                              onChange={(e) =>
                                updateUserField(user.id, "name", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Email</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={user.email}
                              onChange={(e) =>
                                updateUserField(user.id, "email", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Role</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={user.role}
                              onChange={(e) =>
                                updateUserField(user.id, "role", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Status</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={user.status}
                              onChange={(e) =>
                                updateUserField(
                                  user.id,
                                  "status",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label>New Password</Label>
                            <input
                              type="password"
                              className="w-full border p-2 rounded"
                              value={passwordEdits[user.id] || ""}
                              onChange={(e) =>
                                setPasswordEdits((prev) => ({
                                  ...prev,
                                  [user.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            saveUser(user).catch(() =>
                              toast({
                                title: "Save failed",
                                description: "Could not update user.",
                                variant: "destructive",
                              })
                            )
                          }
                        >
                          Save Changes
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No users found.</div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-700">
                  Generated PDFs
                </div>
                <div className="mt-3 space-y-2">
                  {loading ? (
                    <div className="text-sm text-slate-500">Loading...</div>
                  ) : pdfs.length ? (
                    pdfs.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {item.fileName}
                          </div>
                          <div className="text-xs text-slate-500">
                            Invoice: {item.invoiceNumber}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              await downloadPdf(item.id, item.fileName);
                            } catch {
                              toast({
                                title: "Download failed",
                                description: "Could not download PDF.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      No PDFs generated yet.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
