import { useEffect, useState } from "react";
import { Bell, FileText, UserCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
};

export function Header({
  userEmail,
  userName,
  userRole,
  onOpenSettings,
  onLogout,
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const [resolvedProfile, setResolvedProfile] = useState<{
    name?: string;
    email?: string;
    role?: string;
  } | null>(null);
  const [rejections, setRejections] = useState<
    { id: number; field: string; createdAt: string }[]
  >([]);

  const effectiveEmail = userEmail ?? resolvedProfile?.email ?? null;
  const effectiveName = userName ?? resolvedProfile?.name ?? null;
  const effectiveRole = userRole ?? resolvedProfile?.role ?? null;

  useEffect(() => {
    if (userEmail) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
      setResolvedProfile(null);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) {
          setResolvedProfile({
            name: data.name,
            email: data.email,
            role: data.role,
          });
        }
      })
      .catch(() => null);
  }, [userEmail]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    localStorage.removeItem("authToken");
    setResolvedProfile(null);
    setLocation("/");
  };

  const fetchRejections = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setRejections([]);
      return;
    }

    const res = await fetch(
      "/api/user/change-requests?status=rejected&unseen=1",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    setRejections(data || []);
  };

  const markRejectionsSeen = async (ids: number[]) => {
    const token = localStorage.getItem("authToken");
    if (!token || !ids.length) return;
    await fetch("/api/user/change-requests/mark-seen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });
  };

  useEffect(() => {
    fetchRejections().catch(() => null);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none tracking-tight text-foreground">
              PYZ Converter
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
              XML & PDF to PDF Converter - Template Changer
            </p>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-muted-foreground">
              Home
            </Link>
            <Link
              href="/converter"
              className="text-sm font-medium text-muted-foreground"
            >
              Converter
            </Link>
            <span className="text-sm font-medium text-muted-foreground">v1.0.0</span>
            <div className="h-4 w-px bg-border"></div>
            <span className="text-sm font-medium text-muted-foreground">Secure Processing</span>
          </div>
          {!!effectiveEmail && (
            <DropdownMenu
              onOpenChange={(open) => {
                if (open && rejections.length) {
                  const ids = rejections.map((r) => r.id);
                  markRejectionsSeen(ids)
                    .then(() => setRejections([]))
                    .catch(() => null);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notifications"
                  onClick={() => fetchRejections().catch(() => null)}
                >
                  <Bell className="w-5 h-5" />
                  {rejections.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-red-500 px-1 text-[10px] leading-4 text-white">
                      {rejections.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {rejections.length ? (
                  <div className="max-h-64 overflow-auto">
                    {rejections.map((item) => (
                      <div key={item.id} className="px-3 py-2 text-sm">
                        {item.field.toUpperCase()} change was rejected.
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No new notifications.
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu">
                <UserCircle className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-1">
                {effectiveEmail ? (
                  <>
                    {effectiveName && (
                      <div className="truncate font-semibold">
                        {effectiveName}
                      </div>
                    )}
                    <div className="truncate text-xs text-muted-foreground">
                      {effectiveEmail}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Guest</div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {effectiveEmail ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      if (onOpenSettings) {
                        onOpenSettings();
                        return;
                      }
                      setLocation(effectiveRole === "admin" ? "/admin" : "/account");
                    }}
                  >
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/converter">Login</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
