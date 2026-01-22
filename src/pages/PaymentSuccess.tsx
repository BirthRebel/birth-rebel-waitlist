import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, MessageCircle } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("quote_id");

  useEffect(() => {
    // Could trigger confetti or other celebration here
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center pt-32 pb-16 px-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your payment. Your caregiver has been notified and will be in touch soon.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to your email address.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button asChild variant="outline">
                  <Link to="/">
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
