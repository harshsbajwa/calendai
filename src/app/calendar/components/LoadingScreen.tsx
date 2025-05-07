import React from "react";

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-background text-foreground flex h-screen w-screen items-center justify-center font-serif text-xl">
    {message}
  </div>
);

export default LoadingScreen;
