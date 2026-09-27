import {
  Bell,
  Menu,
  Mic,
  Search,
  User,
  VideoIcon,
  Sun,
  Moon,
  Settings2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";

type Theme = "light" | "dark" | "auto";

const Header = () => {
  const {
    user,
    logout,
    handlegooglesignin,
    updateTheme,
  } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);

  // Theme selection
  const [theme, setTheme] = useState<Theme>("auto");

  const router = useRouter();

  /*
   * =========================================================
   * APPLY THEME
   * =========================================================
   */
  const applyTheme = (selectedTheme: Theme) => {
    let finalTheme: "light" | "dark";

    if (selectedTheme === "auto") {
      const now = new Date();

      // Convert current time to IST
      const istTime = new Date(
        now.toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        })
      );

      const totalMinutes =
        istTime.getHours() * 60 +
        istTime.getMinutes();

      /*
       * 10:00 AM - 12:00 PM IST = LIGHT
       * All other times = DARK
       */
      if (
        totalMinutes >= 600 &&
        totalMinutes < 720
      ) {
        finalTheme = "light";
      } else {
        finalTheme = "dark";
      }
    } else {
      finalTheme = selectedTheme;
    }

    // Apply/remove dark class
    document.documentElement.classList.toggle(
      "dark",
      finalTheme === "dark"
    );

    document.documentElement.setAttribute(
      "data-theme",
      finalTheme
    );
  };

  /*
   * =========================================================
   * LOAD SAVED THEME
   * =========================================================
   */
  useEffect(() => {
    const savedTheme: Theme =
      user?.theme === "light" ||
      user?.theme === "dark" ||
      user?.theme === "auto"
        ? user.theme
        : "auto";

    setTheme(savedTheme);

    applyTheme(savedTheme);

    // Auto mode checks the time every minute
    if (savedTheme === "auto") {
      const interval = setInterval(() => {
        applyTheme("auto");
      }, 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user?.theme]);

  /*
   * =========================================================
   * CHANGE THEME
   * =========================================================
   */
  const handleThemeChange = async (
    selectedTheme: Theme
  ) => {
    setTheme(selectedTheme);

    // Immediately apply selected theme
    applyTheme(selectedTheme);

    // Save selected theme to user profile
    if (user?._id) {
      await updateTheme(selectedTheme);
    }
  };

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      router.push(
        `/search?q=${encodeURIComponent(
          searchQuery.trim()
        )}`
      );
    }
  };

  const handleKeypress = (
    e: React.KeyboardEvent
  ) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background text-foreground border-b">
      
      {/* =====================================================
          LEFT SIDE
          ===================================================== */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button>

        <Link
          href="/"
          className="flex items-center gap-1"
        >
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>

          <span className="text-xl font-medium">
            YourTube
          </span>

          <span className="text-xs text-gray-400 ml-1">
            IN
          </span>
        </Link>
      </div>

      {/* =====================================================
          SEARCH
          ===================================================== */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="rounded-l-full border-r-0 focus-visible:ring-0"
          />

          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <Mic className="w-5 h-5" />
        </Button>
      </form>

      {/* =====================================================
          RIGHT SIDE
          ===================================================== */}
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* =================================================
                THEME
                ================================================= */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Theme"
                >
                  {theme === "light" ? (
                    <Sun className="w-5 h-5" />
                  ) : theme === "dark" ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Settings2 className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-40"
                align="end"
              >
                <DropdownMenuItem
                  onClick={() =>
                    handleThemeChange("light")
                  }
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light

                  {theme === "light" && (
                    <span className="ml-auto">
                      ✓
                    </span>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    handleThemeChange("dark")
                  }
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark

                  {theme === "dark" && (
                    <span className="ml-auto">
                      ✓
                    </span>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    handleThemeChange("auto")
                  }
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Auto

                  {theme === "auto" && (
                    <span className="ml-auto">
                      ✓
                    </span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* =================================================
                WATCH PARTY
                ================================================= */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push("/watchparty")
              }
              title="Watch Party"
            >
              <VideoIcon className="w-6 h-6" />
            </Button>

            {/* =================================================
                NOTIFICATIONS
                ================================================= */}
            <Button
              variant="ghost"
              size="icon"
            >
              <Bell className="w-6 h-6" />
            </Button>

            {/* =================================================
                PROFILE
                ================================================= */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.image}
                    />

                    <AvatarFallback>
                      {user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56"
                align="end"
                forceMount
              >
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/channel/${user?._id}`}
                    >
                      Your channel
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setisdialogeopen(true)
                      }
                    >
                      Create Channel
                    </Button>
                  </div>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/history">
                    History
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/liked">
                    Liked videos
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/watch-later">
                    Watch later
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={logout}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            {/* =================================================
                SIGN IN
                ================================================= */}
            <Button
              className="flex items-center gap-2"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}
      </div>

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() =>
          setisdialogeopen(false)
        }
        mode="create"
      />
    </header>
  );
};

export default Header;