import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/birth-rebel-logo.png";
import type { User } from "@supabase/supabase-js";

export const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<"caregiver" | "parent" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Reset state initially
    setIsAdmin(false);
    setUserType(null);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            checkUserType(session.user.id, session.user.email);
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setUserType(null);
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session?.user?.email);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserType(session.user.id, session.user.email);
        checkAdminRole(session.user.id);
      } else {
        setUserType(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserType = async (userId: string, email: string | undefined) => {
    const { data: caregiver } = await supabase
      .from("caregivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (caregiver) {
      setUserType("caregiver");
      return;
    }

    setUserType("parent");
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/">
            <img 
              src={logo} 
              alt="Birth Rebel" 
              className="h-12 md:h-14 lg:h-16"
            />
          </Link>
          
          <nav className="flex gap-4 md:gap-6 items-center flex-wrap">
            <Link 
              to="/" 
              className="text-lg font-semibold hover:text-primary transition-colors"
              style={{ color: '#36454F' }}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-lg font-semibold hover:text-primary transition-colors"
              style={{ color: '#36454F' }}
            >
              About
            </Link>
            
            {isAdmin && (
              <>
                <Link 
                  to="/admin/parent-requests" 
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  style={{ color: '#E2725B' }}
                >
                  Parents
                </Link>
                <Link 
                  to="/admin/caregivers" 
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  style={{ color: '#E2725B' }}
                >
                  Caregivers
                </Link>
                <Link 
                  to="/admin/matches" 
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  style={{ color: '#E2725B' }}
                >
                  Matches
                </Link>
                <Link 
                  to="/admin/import" 
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  style={{ color: '#E2725B' }}
                >
                  Import
                </Link>
              </>
            )}
            
            {user ? (
              userType === "caregiver" ? (
                <Link 
                  to="/caregiver/matches" 
                  className="text-lg font-semibold hover:text-primary transition-colors"
                  style={{ color: '#E2725B' }}
                >
                  My Dashboard
                </Link>
              ) : (
                <Link 
                  to="/parent/dashboard" 
                  className="text-lg font-semibold hover:text-primary transition-colors"
                  style={{ color: '#E2725B' }}
                >
                  My Dashboard
                </Link>
              )
            ) : (
              <Link 
                to="/auth" 
                className="text-lg font-semibold hover:text-primary transition-colors"
                style={{ color: '#36454F' }}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};