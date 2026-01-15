import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  name: string;
  email: string;
  role: string;
  status: string;
};

type ChangeRequest = {
  id: number;
  field: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
};

export default function Account() {
  const [token] = useState<string | null>(() => localStorage.getItem("authToken"));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loadProfile = async (authToken: string) => {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Profile load failed");
    const data = await res.json();
    setProfile(data);
    setNameValue(data.name || "");
    setEmailValue(data.email || "");
  };

  const loadRequests = async (authToken: string) => {
    const res = await fetch("/api/user/change-requests", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Request load failed");
    const data = await res.json();
    setRequests(data);
  };

  const submitRequest = async (field: string, value: string) => {
    if (!token) return;
    if (!value.trim()) {
      toast({
        title: "Missing value",
        description: "Please enter a value before submitting.",
        variant: "destructive",
      });
      return;
    }

    const res = await fetch("/api/user/change-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ field, value }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Request failed");
    }

    toast({
      title: "Request submitted",
      description: "Waiting for admin approval.",
    });
    setPasswordValue("");
    await loadRequests(token);
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([loadProfile(token), loadRequests(token)]).catch(() => {
      toast({
        title: "Failed to load account",
        description: "Please login again.",
        variant: "destructive",
      });
      setLocation("/");
    });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        userEmail={profile?.email}
        userName={profile?.name}
        userRole={profile?.role}
        onOpenSettings={() => setLocation("/account")}
      />

      <main className="flex-1 container mx-auto px-4 py-10 space-y-6">
        {!token ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Please login on the converter page.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setLocation("/converter")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Request updates to your profile fields. Changes require admin approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <input
                      className="w-full border p-2 rounded"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => submitRequest("name", nameValue).catch((err) =>
                        toast({
                          title: "Request failed",
                          description: err instanceof Error ? err.message : "",
                          variant: "destructive",
                        })
                      )}
                    >
                      Request Name Change
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <input
                      className="w-full border p-2 rounded"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => submitRequest("email", emailValue).catch((err) =>
                        toast({
                          title: "Request failed",
                          description: err instanceof Error ? err.message : "",
                          variant: "destructive",
                        })
                      )}
                    >
                      Request Email Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 max-w-md">
                  <Label>New Password</Label>
                  <input
                    type="password"
                    className="w-full border p-2 rounded"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => submitRequest("password", passwordValue).catch((err) =>
                      toast({
                        title: "Request failed",
                        description: err instanceof Error ? err.message : "",
                        variant: "destructive",
                      })
                    )}
                  >
                    Request Password Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Requests</CardTitle>
                <CardDescription>Track your submitted requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.length ? (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col gap-1 rounded-lg border p-3"
                    >
                      <div className="text-sm font-medium text-slate-800">
                        {req.field.toUpperCase()} request
                      </div>
                      <div className="text-xs text-slate-500">
                        Status: {req.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">
                    No change requests yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
