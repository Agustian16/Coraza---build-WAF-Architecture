"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  PageHeader,
  Button,
  Input,
  Label,
  useToast,
} from "@/components/ui";
import { Camera, Trash2 } from "lucide-react";
import {
  changePassword,
  getMe,
  setToken,
  updateProfile,
  type AuthUser,
} from "@/lib/api";

const AVATAR_KEY = "corazium_avatar";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [pw, setPw] = useState({ current: "", new: "" });
  const [avatar, setAvatar] = useState<string | null>(null);
  const { show: showToast, node: toastNode } = useToast();

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        setProfile({ name: u.name, email: u.email });
      })
      .catch(() => {});
    const raf = requestAnimationFrame(() => {
      try {
        setAvatar(localStorage.getItem(AVATAR_KEY));
      } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setAvatar(data);
      try {
        localStorage.setItem(AVATAR_KEY, data);
        showToast("Profile picture updated");
      } catch {
        showToast("Failed to save picture", false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader
        title="User Profile"
        description="Account details, credentials and profile picture"
      />

      <Card className="max-w-2xl">
        <CardHeader title="Profile" subtitle={`Role: ${user?.role ?? "—"}`} />
        <div className="p-5">
          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Profile"
                  className="h-20 w-20 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-cyan-600/15 text-2xl font-bold text-cyan-400">
                  {(user?.name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <label
                htmlFor="avatar-input"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-panel text-muted shadow hover:text-cyan-400"
                aria-label="Change profile picture"
              >
                <Camera size={13} />
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-ink">{user?.name ?? "…"}</div>
              <div className="font-mono text-xs text-muted">{user?.email ?? "…"}</div>
              {avatar && (
                <Button
                  variant="ghost"
                  className="text-[11px]"
                  onClick={() => {
                    setAvatar(null);
                    try {
                      localStorage.removeItem(AVATAR_KEY);
                    } catch {}
                  }}
                >
                  <Trash2 size={12} /> Remove
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Label>Display Name</Label>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              <Label>Email</Label>
              <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              <Button
                variant="primary"
                onClick={() =>
                  updateProfile(profile)
                    .then((res) => {
                      setToken(res.token);
                      setUser(res.user);
                      showToast("Profile updated");
                    })
                    .catch(() => showToast("Failed to update profile", false))
                }
              >
                Save Profile
              </Button>
            </div>

            <div className="space-y-3 lg:border-l lg:border-line lg:pl-6">
              <Label>Current Password</Label>
              <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <Label>New Password (min 8 chars)</Label>
              <Input type="password" value={pw.new} onChange={(e) => setPw({ ...pw, new: e.target.value })} />
              <Button
                onClick={() =>
                  changePassword(pw.current, pw.new)
                    .then(() => {
                      showToast("Password changed");
                      setPw({ current: "", new: "" });
                    })
                    .catch(() => showToast("Failed to change password", false))
                }
              >
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </Card>
      {toastNode}
    </>
  );
}