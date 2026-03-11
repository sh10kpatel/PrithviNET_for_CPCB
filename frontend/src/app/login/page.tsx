"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Loader2 } from "lucide-react";
import { login, register } from "@/lib/api";
import { useAppStore } from "@/store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser, setToken } = useAppStore();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await login(loginEmail, loginPassword);
      localStorage.setItem("access_token", resp.access_token);
      setToken(resp.access_token);
      setUser(resp.user);
      router.push("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
      });
      // Auto login after register
      const resp = await login(regEmail, regPassword);
      localStorage.setItem("access_token", resp.access_token);
      setToken(resp.access_token);
      setUser(resp.user);
      router.push("/");
    } catch {
      setError("Registration failed. Email may already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>PrithviNET</CardTitle>
          <CardDescription>
            Environmental Monitoring & Compliance Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@prithvinet.in"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="password"
                  className="mt-1"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Sign In
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo: admin@prithvinet.in / admin123
              </p>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a password"
                  className="mt-1"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleRegister}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
