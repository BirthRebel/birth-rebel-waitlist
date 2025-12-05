import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/birth-rebel-logo.png";
import type { User } from "@supabase/supabase-js";

export const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isCaregiver, setIsCaregiver] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkIfCaregiver(session.user.id), 0);
        } else {
          setIsCaregiver(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkIfCaregiver(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfCaregiver = async (userId: string) => {
    const { data } = await supabase
      .from("caregivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    setIsCaregiver(!!data);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link to="/">
            <img 
              src={logo} 
              alt="Birth Rebel" 
              className="h-32 md:h-40 lg:h-48"
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
            {user && isCaregiver ? (
              <Link 
                to="/caregiver/matches" 
                className="text-lg font-semibold hover:text-primary transition-colors"
                style={{ color: '#E2725B' }}
              >
                My Matches
              </Link>
            ) : (
              <Link 
                to="/caregiver/auth" 
                className="text-lg font-semibold hover:text-primary transition-colors"
                style={{ color: '#36454F' }}
              >
                Caregiver Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
