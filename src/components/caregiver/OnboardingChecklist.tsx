import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText, 
  Calendar, 
  CreditCard, 
  Shield,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CaregiverData {
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  hourly_rate: number | null;
  profile_photo_url: string | null;
  profile_completed_at: string | null;
  training_certificate_url: string | null;
  insurance_certificate_url: string | null;
  insurance_certificate_expires: string | null;
  dbs_certificate_url: string | null;
  code_of_conduct_accepted: boolean | null;
  stripe_onboarding_complete: boolean | null;
  cal_link: string | null;
}

interface OnboardingChecklistProps {
  caregiver: CaregiverData;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

export const OnboardingChecklist = ({ caregiver }: OnboardingChecklistProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const goToProfile = () => navigate("/caregiver/profile");

  const items: ChecklistItem[] = [
    {
      id: "profile",
      label: "Complete your profile",
      description: "Add your name, bio, photo, and rates",
      completed: !!(
        caregiver.first_name &&
        caregiver.last_name &&
        caregiver.bio &&
        caregiver.hourly_rate &&
        caregiver.profile_photo_url &&
        caregiver.profile_completed_at
      ),
      icon: <User className="h-4 w-4" />,
      action: goToProfile,
      actionLabel: "Edit Profile",
    },
    {
      id: "code_of_conduct",
      label: "Accept the Code of Conduct",
      description: "Review and accept our community guidelines",
      completed: !!caregiver.code_of_conduct_accepted,
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "documents",
      label: "Upload your documents",
      description: "Training certificate, DBS check, and any additional certificates",
      completed: !!(caregiver.training_certificate_url && caregiver.dbs_certificate_url),
      icon: <FileText className="h-4 w-4" />,
      action: goToProfile,
      actionLabel: "Upload Documents",
    },
    {
      id: "insurance",
      label: "Upload insurance & set expiry date",
      description: "Upload your insurance certificate and set the expiry date",
      completed: !!(caregiver.insurance_certificate_url && caregiver.insurance_certificate_expires),
      icon: <FileText className="h-4 w-4" />,
      action: goToProfile,
      actionLabel: "Upload Insurance",
    },
    {
      id: "calendar",
      label: "Set up your booking calendar",
      description: "Create a Cal.com account with Cal Video and paste your booking link",
      completed: !!caregiver.cal_link,
      icon: <Video className="h-4 w-4" />,
      action: goToProfile,
      actionLabel: "Set Up Calendar",
    },
    {
      id: "stripe",
      label: "Set up Stripe for payments",
      description: "Connect your bank account so you can receive payouts",
      completed: !!caregiver.stripe_onboarding_complete,
      icon: <CreditCard className="h-4 w-4" />,
      action: goToProfile,
      actionLabel: "Set Up Payments",
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;

  // Don't show if everything is done
  if (allComplete) return null;

  return (
    <Card className={cn(
      "mb-6 border-2 overflow-hidden",
      allComplete ? "border-green-300" : "border-amber-300"
    )}>
      <CardHeader
        className="cursor-pointer hover:bg-accent/50 transition-colors py-3 px-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-full p-1.5",
              allComplete ? "bg-green-100" : "bg-amber-100"
            )}>
              {allComplete ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">
                {allComplete ? "Onboarding Complete!" : "Complete Your Onboarding"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedCount} of {totalCount} steps completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    allComplete ? "bg-green-500" : "bg-amber-500"
                  )}
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  item.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "rounded-full p-1 shrink-0",
                    item.completed ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {item.completed ? <Check className="h-4 w-4" /> : item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
                {!item.completed && item.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 shrink-0 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action!();
                    }}
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
