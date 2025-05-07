"use client";

import React, { useEffect } from "react";

const RedirectToSignIn: React.FC = () => {
  useEffect(() => {
    window.location.href = "/api/auth/signin";
  }, []);
  return (
    <div className="bg-background text-foreground flex h-screen w-screen items-center justify-center" />
  );
};

export default RedirectToSignIn;
