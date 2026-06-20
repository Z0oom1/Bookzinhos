import { Outlet, useLocation, Link, useNavigate } from "react-router";
import { Home, Library, Heart, PenLine, User, Users } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { fetchNotifications } from "../lib/api";

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState("🐼");
  const [currentDateString, setCurrentDateString] = useState("");
  
  // Resizable window and full screen states for desktop client
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [windowSize, setWindowSize] = useState(() => {
    const defaultWidth = 1100;
    const defaultHeight = 780;
    if (typeof window !== "undefined") {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      return {
        width: Math.min(defaultWidth, screenWidth - 32),
        height: Math.min(defaultHeight, screenHeight - 32)
      };
    }
    return { width: defaultWidth, height: defaultHeight };
  });
  const [windowPos, setWindowPos] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingTouch, setIsDraggingTouch] = useState(false);
  const [isResizingTouch, setIsResizingTouch] = useState(false);

  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const dragStartTouch = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0, width: 0, height: 0, direction: "" });
  const resizeStartTouch = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0, width: 0, height: 0, direction: "" });

  const parentRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Monitor window resize to clamp simulated window size & position
  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      let finalWidth = windowSize.width;
      let finalHeight = windowSize.height;

      setWindowSize(prev => {
        const newWidth = Math.min(prev.width, screenWidth - 32);
        const newHeight = Math.min(prev.height, screenHeight - 32);
        finalWidth = newWidth;
        finalHeight = newHeight;
        if (newWidth !== prev.width || newHeight !== prev.height) {
          return { width: newWidth, height: newHeight };
        }
        return prev;
      });

      setWindowPos(prev => {
        if (!prev) return null;
        const maxLeft = screenWidth - finalWidth - 16;
        const maxTop = screenHeight - finalHeight - 16;
        const x = Math.max(16, Math.min(prev.x, maxLeft));
        const y = Math.max(16, Math.min(prev.y, maxTop));
        if (x !== prev.x || y !== prev.y) {
          return { x, y };
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [windowSize]);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") || 
      target.closest("a") || 
      target.closest("input") || 
      target.closest("select") || 
      target.closest("textarea") ||
      target.closest("[role='button']")
    ) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);

    let currentPos = windowPos;
    if (!currentPos && parentRef.current && windowRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      const windowRect = windowRef.current.getBoundingClientRect();
      currentPos = {
        x: windowRect.left - parentRect.left,
        y: windowRect.top - parentRect.top,
      };
      setWindowPos(currentPos);
    }

    const posX = currentPos ? currentPos.x : 0;
    const posY = currentPos ? currentPos.y : 0;

    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: posX,
      posY: posY,
    };
  };

  const handleDragTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") || 
      target.closest("a") || 
      target.closest("input") || 
      target.closest("select") || 
      target.closest("textarea") ||
      target.closest("[role='button']")
    ) {
      return;
    }

    setIsDraggingTouch(true);

    let currentPos = windowPos;
    if (!currentPos && parentRef.current && windowRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      const windowRect = windowRef.current.getBoundingClientRect();
      currentPos = {
        x: windowRect.left - parentRect.left,
        y: windowRect.top - parentRect.top,
      };
      setWindowPos(currentPos);
    }

    const posX = currentPos ? currentPos.x : 0;
    const posY = currentPos ? currentPos.y : 0;

    const touch = e.touches[0];
    dragStartTouch.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: posX,
      posY: posY,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    let currentPos = windowPos;
    if (!currentPos && parentRef.current && windowRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      const windowRect = windowRef.current.getBoundingClientRect();
      currentPos = {
        x: windowRect.left - parentRect.left,
        y: windowRect.top - parentRect.top,
      };
      setWindowPos(currentPos);
    }

    const posX = currentPos ? currentPos.x : 0;
    const posY = currentPos ? currentPos.y : 0;

    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: posX,
      posY: posY,
      width: windowSize.width,
      height: windowSize.height,
      direction: direction,
    };
  };

  const handleResizeTouchStart = (e: React.TouchEvent, direction: string) => {
    e.stopPropagation();
    setIsResizingTouch(true);

    let currentPos = windowPos;
    if (!currentPos && parentRef.current && windowRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      const windowRect = windowRef.current.getBoundingClientRect();
      currentPos = {
        x: windowRect.left - parentRect.left,
        y: windowRect.top - parentRect.top,
      };
      setWindowPos(currentPos);
    }

    const posX = currentPos ? currentPos.x : 0;
    const posY = currentPos ? currentPos.y : 0;

    const touch = e.touches[0];
    resizeStartTouch.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: posX,
      posY: posY,
      width: windowSize.width,
      height: windowSize.height,
      direction: direction,
    };
  };

  // Mouse drag effect
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      
      const parentRect = parentRef.current?.getBoundingClientRect();
      const maxX = parentRect ? parentRect.width - windowSize.width - 16 : window.innerWidth - windowSize.width - 16;
      const maxY = parentRect ? parentRect.height - windowSize.height - 16 : window.innerHeight - windowSize.height - 16;

      setWindowPos({
        x: Math.max(16, Math.min(dragStart.current.posX + dx, maxX)),
        y: Math.max(16, Math.min(dragStart.current.posY + dy, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, windowSize]);

  // Touch drag effect
  useEffect(() => {
    if (!isDraggingTouch) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartTouch.current.mouseX;
      const dy = touch.clientY - dragStartTouch.current.mouseY;
      
      const parentRect = parentRef.current?.getBoundingClientRect();
      const maxX = parentRect ? parentRect.width - windowSize.width - 16 : window.innerWidth - windowSize.width - 16;
      const maxY = parentRect ? parentRect.height - windowSize.height - 16 : window.innerHeight - windowSize.height - 16;

      setWindowPos({
        x: Math.max(16, Math.min(dragStartTouch.current.posX + dx, maxX)),
        y: Math.max(16, Math.min(dragStartTouch.current.posY + dy, maxY)),
      });
    };

    const handleTouchEnd = () => {
      setIsDraggingTouch(false);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDraggingTouch, windowSize]);

  // Mouse resize effect
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { mouseX, mouseY, posX, posY, width, height, direction } = resizeStart.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;

      const minWidth = 850;
      const minHeight = 550;

      const parentWidth = parentRef.current?.clientWidth || window.innerWidth;
      const parentHeight = parentRef.current?.clientHeight || window.innerHeight;
      const maxWidth = parentWidth - 32;
      const maxHeight = parentHeight - 32;

      let newWidth = width;
      let newHeight = height;
      let newX = posX;
      let newY = posY;

      if (direction.includes("e")) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, width + dx));
      } else if (direction.includes("w")) {
        const potentialWidth = width - dx;
        newWidth = Math.max(minWidth, Math.min(maxWidth, potentialWidth));
        const actualChange = newWidth - width;
        newX = posX - actualChange;
      }

      if (direction.includes("s")) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, height + dy));
      } else if (direction.includes("n")) {
        const potentialHeight = height - dy;
        newHeight = Math.max(minHeight, Math.min(maxHeight, potentialHeight));
        const actualChange = newHeight - height;
        newY = posY - actualChange;
      }

      const maxXPos = parentWidth - newWidth - 16;
      const maxYPos = parentHeight - newHeight - 16;
      newX = Math.max(16, Math.min(newX, maxXPos));
      newY = Math.max(16, Math.min(newY, maxYPos));

      setWindowSize({ width: newWidth, height: newHeight });
      setWindowPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Touch resize effect
  useEffect(() => {
    if (!isResizingTouch) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const { mouseX, mouseY, posX, posY, width, height, direction } = resizeStartTouch.current;
      const dx = touch.clientX - mouseX;
      const dy = touch.clientY - mouseY;

      const minWidth = 850;
      const minHeight = 550;

      const parentWidth = parentRef.current?.clientWidth || window.innerWidth;
      const parentHeight = parentRef.current?.clientHeight || window.innerHeight;
      const maxWidth = parentWidth - 32;
      const maxHeight = parentHeight - 32;

      let newWidth = width;
      let newHeight = height;
      let newX = posX;
      let newY = posY;

      if (direction.includes("e")) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, width + dx));
      } else if (direction.includes("w")) {
        const potentialWidth = width - dx;
        newWidth = Math.max(minWidth, Math.min(maxWidth, potentialWidth));
        const actualChange = newWidth - width;
        newX = posX - actualChange;
      }

      if (direction.includes("s")) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, height + dy));
      } else if (direction.includes("n")) {
        const potentialHeight = height - dy;
        newHeight = Math.max(minHeight, Math.min(maxHeight, potentialHeight));
        const actualChange = newHeight - height;
        newY = posY - actualChange;
      }

      const maxXPos = parentWidth - newWidth - 16;
      const maxYPos = parentHeight - newHeight - 16;
      newX = Math.max(16, Math.min(newX, maxXPos));
      newY = Math.max(16, Math.min(newY, maxYPos));

      setWindowSize({ width: newWidth, height: newHeight });
      setWindowPos({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsResizingTouch(false);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isResizingTouch]);

  useEffect(() => {
    async function checkNotifications() {
      try {
        const data = await fetchNotifications();
        setUnreadCount(data.unreadCount);
      } catch (err) {}
    }
    
    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const avatar = localStorage.getItem("books-avatar") || "🐼";
    setUserAvatar(avatar);

    const date = new Date();
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    setCurrentDateString(formatted);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  interface NavItem {
    path: string;
    icon: React.ComponentType<any>;
    label: string;
    desktopLabel: string;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { path: "/", icon: Home, label: "Início", desktopLabel: "Home" },
    { path: "/library", icon: Library, label: "Livros", desktopLabel: "Biblioteca" },
    { path: "/social", icon: Users, label: "Social", badge: unreadCount, desktopLabel: "Social" },
    { path: "/my-books", icon: Heart, label: "Amei", desktopLabel: "Amei" },
    { path: "/notes", icon: PenLine, label: "Notas", desktopLabel: "Notinhas" },
  ];

  const isChat = location.pathname.startsWith("/chat/");
  const isRead = location.pathname.startsWith("/read/");
  const hideNav = new URLSearchParams(location.search).get("hideNav") === "true" || isChat || isRead;

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex justify-center items-center min-h-screen bg-slate-100">
        <div className="w-full max-w-lg h-screen flex flex-col bg-background relative overflow-hidden shadow-2xl border-x border-slate-200/40">
          <main className={`flex-1 overflow-y-auto ${hideNav ? "" : "pb-32"}`}>
            <Outlet />
          </main>

          {!hideNav && (
            <nav className="absolute bottom-0 left-0 right-0 z-50 px-2 pb-6">
              <div className="bg-white/90 backdrop-blur-3xl border border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-[2.5rem] h-20 flex items-center justify-between px-2">
                {[...navItems, { path: "/profile", icon: User, label: "Eu", desktopLabel: "Eu" } as NavItem].map(({ path, icon: Icon, label, badge }) => (
                  <Link
                    key={path}
                    to={path}
                    className="flex-1 flex flex-col items-center justify-center relative h-full transition-all active:scale-90"
                  >
                    <div className={`relative flex items-center justify-center p-2 rounded-2xl transition-all duration-300 ${isActive(path) ? "bg-[var(--primary)]/10" : ""}`}>
                      <Icon
                        className={`w-6 h-6 transition-all duration-300 ${
                          isActive(path)
                            ? "text-[var(--primary)] scale-110 drop-shadow-[0_0_8px_rgba(243,168,184,0.4)]"
                            : "text-[var(--text-muted)] opacity-50"
                        }`}
                      />
                      
                      {/* Badge de Notificações */}
                      {typeof badge === 'number' && badge > 0 ? (
                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm px-1 z-10 animate-in zoom-in duration-300">
                          {badge > 99 ? "99+" : badge}
                        </div>
                      ) : (
                        isActive(path) && (
                          <div className="absolute -bottom-1 w-1 h-1 bg-[var(--primary)] rounded-full shadow-[0_0_8px_var(--primary)]" />
                        )
                      )}
                    </div>
                    <span
                      className={`text-[8px] font-black mt-1 transition-all duration-300 uppercase tracking-tighter ${
                        isActive(path)
                          ? "text-[var(--primary)] opacity-100"
                          : "text-[var(--text-muted)] opacity-0 -translate-y-1"
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* Desktop-only View */}
      <div 
        ref={parentRef}
        style={isFullScreen ? {} : { backgroundImage: "url('/mac_wallpaper.png')", backgroundSize: "cover", backgroundPosition: "center" }}
        className={`hidden lg:flex items-center justify-center w-screen h-screen overflow-hidden select-none relative ${
          isFullScreen ? "bg-background" : "p-8"
        }`}
      >
        <div 
          ref={windowRef}
          style={isFullScreen ? {} : { 
            width: windowSize.width, 
            height: windowSize.height,
            ...(windowPos ? { position: 'absolute', left: `${windowPos.x}px`, top: `${windowPos.y}px` } : {})
          }}
          className={`bg-white flex flex-col overflow-hidden backdrop-blur-xl relative ${(!isDragging && !isResizing) ? "transition-all duration-300" : ""} ${
            isFullScreen 
              ? "w-full h-full rounded-none border-none shadow-none" 
              : "rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20"
          }`}
        >
          {/* Top Header/Navbar */}
          {!hideNav ? (
            <header 
              onMouseDown={handleDragMouseDown}
              onTouchStart={handleDragTouchStart}
              className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 cursor-default select-none"
            >
              {/* Left: macOS Dots & Title */}
              <div className="flex items-center gap-4">
                <div onMouseDown={(e) => e.stopPropagation()} className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:opacity-80 transition-opacity cursor-pointer" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:opacity-80 transition-opacity cursor-pointer" />
                  <span 
                    onClick={() => setIsFullScreen(prev => !prev)}
                    title="Toggle Fullscreen"
                    className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center text-[8px] font-bold text-green-900"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400 select-none">Bookzinhos da Helo</span>
              </div>

              {/* Center: Tabs navigation */}
              <nav className="flex items-center gap-1.5">
                {navItems.map(({ path, desktopLabel, badge }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                      isActive(path)
                        ? "bg-slate-100 text-slate-800"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span>{desktopLabel}</span>
                    {typeof badge === 'number' && badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
                        {badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              {/* Right: Date, Profile Avatar */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500">{currentDateString}</span>
                <Link
                  to="/profile"
                  className={`w-8 h-8 rounded-full bg-slate-50 overflow-hidden border flex items-center justify-center text-base hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    isActive("/profile") ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/10" : "border-slate-200"
                  }`}
                >
                  {userAvatar}
                </Link>
              </div>
            </header>
          ) : (
            <>
              {/* macOS top buttons floating overlay for reader view (hideNav = true) */}
              <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-4.5 left-5 z-[9999] flex gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                <span 
                  onClick={() => navigate(-1)}
                  className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer" 
                />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer" />
                <span 
                  onClick={() => setIsFullScreen(prev => !prev)}
                  title="Toggle Fullscreen"
                  className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer flex items-center justify-center text-[8px] font-bold text-green-900"
                />
              </div>

              {/* Transparent drag bar for reader view */}
              {!isFullScreen && (
                <div 
                  onMouseDown={handleDragMouseDown}
                  onTouchStart={handleDragTouchStart}
                  className="absolute top-0 left-0 right-0 h-10 z-[9997] cursor-default"
                />
              )}
            </>
          )}

          {/* Page Contents */}
          <main className={`flex-1 overflow-y-auto ${hideNav ? "pt-10 lg:pt-0" : ""} bg-slate-50/20`}>
            <Outlet />
          </main>

          {!isFullScreen && (
            <>
              {/* Border Resize Handles */}
              <div onMouseDown={(e) => handleResizeMouseDown(e, "n")} onTouchStart={(e) => handleResizeTouchStart(e, "n")} className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "s")} onTouchStart={(e) => handleResizeTouchStart(e, "s")} className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "e")} onTouchStart={(e) => handleResizeTouchStart(e, "e")} className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "w")} onTouchStart={(e) => handleResizeTouchStart(e, "w")} className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "nw")} onTouchStart={(e) => handleResizeTouchStart(e, "nw")} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "ne")} onTouchStart={(e) => handleResizeTouchStart(e, "ne")} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "sw")} onTouchStart={(e) => handleResizeTouchStart(e, "sw")} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-[9999]" />
              <div onMouseDown={(e) => handleResizeMouseDown(e, "se")} onTouchStart={(e) => handleResizeTouchStart(e, "se")} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[9999] flex items-end justify-end p-1">
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-300 fill-current opacity-70">
                  <path d="M10,0 L0,10 L10,10 Z" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
