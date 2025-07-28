import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown } from "lucide-react";
import { useLogout, useSignerStatus, useUser, useSmartAccountClient } from "@account-kit/react";
import { useAuthModal } from "@account-kit/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { formatAddress } from "@/lib/utils";

export default function Header() {
  const { logout } = useLogout();
  const { isConnected } = useSignerStatus();
  const user = useUser();
  const { client } = useSmartAccountClient({});
  const { openAuthModal } = useAuthModal();

  const userAddress = client?.account?.address;
  const truncatedAddress = userAddress ? formatAddress(userAddress) : "";
// {formatAddress(client?.account?.address ?? "")}
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Image
            src="/smart-wallets.svg"
            alt="Smart Wallets"
            width={200}
            height={26}
            className="h-6 w-auto"
          />
        </div>

        {isConnected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                </div>
                <span>Hello, {truncatedAddress}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hello,</p>
                    <p className="text-sm text-muted-foreground">{truncatedAddress}</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground">EOA Address</p>
                <p className="text-sm font-mono">{truncatedAddress}</p>
              </div>
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={() => openAuthModal()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  );
}
