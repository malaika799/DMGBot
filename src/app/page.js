"use client";
import ThemeScript from "@/components/ThemeScript";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#120c2e] via-[#1a1240] to-[#150c33]">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  );
}