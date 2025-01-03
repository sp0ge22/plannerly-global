import { motion, AnimatePresence } from "framer-motion";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { FiMenu, FiArrowRight } from "react-icons/fi";
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Settings, Users, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";

const FlipNavWrapper = () => {
  return (
    <div className="bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FlipNav />
      </div>
    </div>
  );
};

const FlipNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="bg-black p-4 flex items-center justify-between relative">
      <NavLeft setIsOpen={setIsOpen} />
      <NavRight />
      <NavMenu isOpen={isOpen} />
    </nav>
  );
};

const Logo = () => {
  return (
    <Link href="/tasks" className="flex items-center gap-2">
      <Icons.logo className="h-8 w-8 text-white" />
      <span className="text-xl font-bold text-white">Plannerly</span>
    </Link>
  );
};

const NavLeft = ({
  setIsOpen,
}: {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex items-center gap-6">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="block lg:hidden text-white text-2xl"
        onClick={() => setIsOpen((pv) => !pv)}
      >
        <FiMenu />
      </motion.button>
      <Logo />
      <NavLink text="Tasks" href="/tasks" />
      <NavLink text="Resources" href="/resources" />
      <NavLink text="Email Assistant" href="/email-assistant" />
    </div>
  );
};

const NavRight = () => {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [avatarColor, setAvatarColor] = useState('');
  const [avatarLetter, setAvatarLetter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);

        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('avatar_color, avatar_letter, is_admin, avatar_url, name')
            .eq('id', session.user.id)
            .single();

          if (!error && profileData) {
            setAvatarColor(profileData.avatar_color || 'bg-red-600');
            setAvatarLetter(profileData.avatar_letter || 'U');
            setIsAdmin(profileData.is_admin || false);
            setUserName(profileData.name || session.user.email?.split('@')[0] || 'User');
            if (profileData.avatar_url) {
              localStorage.setItem('avatarUrl', profileData.avatar_url);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setAvatarColor('');
        setAvatarLetter('');
        setUserName('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      setIsAuthenticated(false);
      localStorage.clear();
      await supabase.auth.signOut().catch(console.error);
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      await router.refresh();
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      window.location.href = '/';
    }
  };

  return (
    <AnimatePresence mode="popLayout">
      {isAuthenticated ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-3 px-2 hover:bg-white/10 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={localStorage.getItem('avatarUrl') || undefined} />
                  <AvatarFallback className={isLoading ? 'animate-pulse bg-gray-600' : avatarColor}>
                    {isLoading ? '' : avatarLetter}
                  </AvatarFallback>
                </Avatar>
                <span className="text-base font-bold text-white">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>User Management</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

const NavLink = ({ text, href }: { text: string; href: string }) => {
  return (
    <Link
      href={href}
      className="hidden lg:block h-[30px] overflow-hidden font-medium"
    >
      <motion.div whileHover={{ y: -30 }}>
        <span className="flex items-center h-[30px] text-white">{text}</span>
        <span className="flex items-center h-[30px] text-violet-500">
          {text}
        </span>
      </motion.div>
    </Link>
  );
};

const NavMenu = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <motion.div
      variants={menuVariants}
      initial="closed"
      animate={isOpen ? "open" : "closed"}
      className="absolute p-4 bg-black shadow-lg left-0 right-0 -mx-4 sm:-mx-6 lg:-mx-8 top-full origin-top flex flex-col gap-4"
    >
      <MenuLink text="Tasks" href="/tasks" />
      <MenuLink text="Time Sheet" href="/timesheet" />
      <MenuLink text="Resources" href="/resources" />
      <MenuLink text="Notes" href="/notes" />
      <MenuLink text="Email Assistant" href="/email-assistant" />
    </motion.div>
  );
};

const MenuLink = ({ text, href }: { text: string; href: string }) => {
  return (
    <motion.div variants={menuLinkVariants}>
      <Link
        href={href}
        className="h-[30px] overflow-hidden font-medium text-lg flex items-start gap-2"
      >
        <motion.span variants={menuLinkArrowVariants}>
          <FiArrowRight className="h-[30px] text-white" />
        </motion.span>
        <motion.div whileHover={{ y: -30 }}>
          <span className="flex items-center h-[30px] text-white">{text}</span>
          <span className="flex items-center h-[30px] text-violet-500">
            {text}
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default FlipNavWrapper;

const menuVariants = {
  open: {
    scaleY: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  closed: {
    scaleY: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.1,
    },
  },
};

const menuLinkVariants = {
  open: {
    y: 0,
    opacity: 1,
  },
  closed: {
    y: -10,
    opacity: 0,
  },
};

const menuLinkArrowVariants = {
  open: {
    x: 0,
  },
  closed: {
    x: -4,
  },
};