"use client";

import type React from "react";
import { useEffect } from "react";

const RedirectToSignIn: React.FC = () => {
  useEffect(() => {
    window.location.href = "/api/auth/signin";
  }, []);
  return null;
};

export default RedirectToSignIn;
