"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { User as UserIcon, LogOut, Settings } from "lucide-react";
import ThemeToggle from "~/app/calendar/components/ThemeToggle";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

interface SidebarFooterActionsProps {
  isExpanded: boolean;
}

const SidebarFooterActions: React.FC<SidebarFooterActionsProps> = ({
  isExpanded,
}) => {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-border/50 mt-auto flex items-center border-t pt-3",
        isExpanded
          ? "flex-row justify-between"
          : "flex-col justify-center gap-2",
      )}
    >
      <ThemeToggle
        className={cn(isExpanded ? "h-8 w-8" : "h-9 w-9")}
        iconClassName={cn(isExpanded ? "h-4 w-4" : "h-5 w-5")}
      />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative rounded-full",
                  isExpanded ? "h-8 w-8" : "h-9 w-9",
                )}
                aria-label="Open user menu"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    fill
                    sizes={isExpanded ? "32px" : "36px"}
                    className="rounded-full object-cover"
                    priority={false}
                  />
                ) : (
                  <UserIcon className={isExpanded ? "h-4 w-4" : "h-5 w-5"} />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent side="right">
              <p>{session.user.name ?? "User Menu"}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent
          align="end"
          side={isExpanded ? "top" : "right"}
          sideOffset={8}
          className="w-56"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {session.user.name ?? "Account"}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {session.user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer dark:text-red-400 dark:focus:text-red-400"
            onClick={() => {
              window.location.href = "/api/auth/signout";
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SidebarFooterActions;
