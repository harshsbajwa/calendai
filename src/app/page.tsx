"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";

const LandingPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/calendar");
    }
  }, [session, status, router]);

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="pointer-events-none flex h-full w-full items-center justify-center">
        <h1 className="dream-text">calendai</h1>
      </div>
      <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 space-x-4">
         <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm">
            <Link href="/calendar">
                Enter App
            </Link>
        </Button>
         <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm">
            <Link href="/api/auth/signin">
                Login / Sign Up
            </Link>
        </Button>
      </div>

      <p className="absolute bottom-4 text-xs text-neutral-400">
        © {new Date().getFullYear()} calendai. All rights reserved.
      </p>
    </main>
  );
};

export default LandingPage;