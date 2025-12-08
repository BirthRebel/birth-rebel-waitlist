import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/birth-rebel-logo.png";
import type { User } from "@supabase/supabase-js";

export const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<"caregiver" | "parent" | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkUserType(session.user.id, session.user.email), 0);
        } else {
          setUserType(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserType(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserType = async (userId: string, email: string | undefined) => {
    // Check if caregiver first
    const { data: caregiver } = await supabase
      .from("caregivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (caregiver) {
      setUserType("caregiver");
      return;
    }

    // Otherwise treat as parent
    setUserType("parent");
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
          
          <nav className="flex gap-8 items-center">
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
