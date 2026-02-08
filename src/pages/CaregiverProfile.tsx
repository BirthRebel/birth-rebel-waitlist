import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, User, Calendar, FileText, CreditCard, Check, ExternalLink } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { StripeConnectCard } from "@/components/caregiver/StripeConnectCard";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface CaregiverProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  pronouns: string | null;
  city_town: string | null;
  country: string | null;
  bio: string | null;
  hourly_rate: number | null;
  doula_package_rate: number | null;
  profile_photo_url: string | null;
  insurance_certificate_expires: string | null;
  insurance_certificate_url: string | null;
  training_certificate_url: string | null;
  dbs_certificate_url: string | null;
  additional_certificate_1_url: string | null;
  additional_certificate_2_url: string | null;
  is_doula: boolean | null;
  is_private_midwife: boolean | null;
  is_lactation_consultant: boolean | null;
  is_sleep_consultant: boolean | null;
  is_hypnobirthing_coach: boolean | null;
  is_bereavement_councillor: boolean | null;
  years_practicing: string | null;
  births_supported: string | null;
  profile_completed_at: string | null;
  cal_link: string | null;
}

const CaregiverProfilePage = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form state - editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cityTown, setCityTown] = useState("");
  const [country, setCountry] = useState("");
  const [yearsPracticing, setYearsPracticing] = useState("");
  const [birthsSupported, setBirthsSupported] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [doulaPackageRate, setDoulaPackageRate] = useState("");
  const [insuranceExpires, setInsuranceExpires] = useState("");
  const [calLink, setCalLink] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/caregiver/auth", { replace: true });
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/caregiver/auth", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("caregivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "No caregiver profile found",
          description: "Please contact support.",
          variant: "destructive",
        });
        return;
      }

      setProfile(data as CaregiverProfile);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setPhone(data.phone || "");
      setCityTown(data.city_town || "");
      setCountry(data.country || "");
      setYearsPracticing(data.years_practicing || "");
      setBirthsSupported(data.births_supported || "");
      setBio(data.bio || "");
      setHourlyRate(data.hourly_rate?.toString() || "");
      setDoulaPackageRate(data.doula_package_rate?.toString() || "");
      setInsuranceExpires(data.insurance_certificate_expires || "");
      setCalLink(data.cal_link || "");
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("caregiver-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("caregiver-photos")
        .getPublicUrl(filePath);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from("caregivers")
        .update({ profile_photo_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_photo_url: publicUrl });
      toast({
        title: "Photo uploaded!",
        description: "Your profile photo has been updated.",
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    // Validate required fields
    if (!bio.trim()) {
      toast({
        title: "Bio required",
        description: "Please add a short bio about yourself.",
        variant: "destructive",
      });
      return;
    }

    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      toast({
        title: "Hourly rate required",
        description: "Please enter your hourly rate.",
        variant: "destructive",
      });
      return;
    }

    if (profile.is_doula && (!doulaPackageRate || parseFloat(doulaPackageRate) <= 0)) {
      toast({
        title: "Doula package rate required",
        description: "As a doula, please enter your full support package rate.",
        variant: "destructive",
      });
      return;
    }

    // Insurance is optional - no validation needed

    if (!profile.profile_photo_url) {
      toast({
        title: "Profile photo required",
        description: "Please upload a profile photo.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        city_town: cityTown.trim() || null,
        country: country.trim() || null,
        years_practicing: yearsPracticing.trim() || null,
        births_supported: birthsSupported.trim() || null,
        bio: bio.trim(),
        hourly_rate: parseFloat(hourlyRate),
        insurance_certificate_expires: insuranceExpires || null,
        profile_completed_at: new Date().toISOString(),
        cal_link: calLink.trim() || null,
      };

      if (profile.is_doula) {
        updateData.doula_package_rate = parseFloat(doulaPackageRate);
      }

      const { error } = await supabase
        .from("caregivers")
        .update(updateData)
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profile saved!",
        description: "Your profile has been updated successfully.",
      });

      // Navigate to matches page
      navigate("/caregiver/matches");
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Error saving profile",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getRoles = () => {
    if (!profile) return [];
    const roles = [];
    if (profile.is_doula) roles.push("Doula");
    if (profile.is_private_midwife) roles.push("Private Midwife");
    if (profile.is_lactation_consultant) roles.push("Lactation Consultant");
    if (profile.is_sleep_consultant) roles.push("Sleep Consultant");
    if (profile.is_hypnobirthing_coach) roles.push("Hypnobirthing Coach");
    if (profile.is_bereavement_councillor) roles.push("Bereavement Counsellor");
    return roles;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-32">
          <p className="text-muted-foreground">No profile found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const isProfileComplete = profile.profile_completed_at;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {isProfileComplete ? "My Profile" : "Complete Your Profile"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isProfileComplete 
                  ? "Update your information anytime" 
                  : "Please add the following information to complete your profile"}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>

          {/* Personal Information - Editable */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your contact details and experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name *</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name *</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Your last name"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p className="font-medium text-sm py-2">{profile.email}</p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="city-town">City/Town</Label>
                  <Input
                    id="city-town"
                    value={cityTown}
                    onChange={(e) => setCityTown(e.target.value)}
                    placeholder="Your city or town"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Your country"
                  />
                </div>
                <div>
                  <Label htmlFor="years-practicing">Years Practicing</Label>
                  <Input
                    id="years-practicing"
                    value={yearsPracticing}
                    onChange={(e) => setYearsPracticing(e.target.value)}
                    placeholder="e.g. 5 years"
                  />
                </div>
                <div>
                  <Label htmlFor="births-supported">Births Supported</Label>
                  <Input
                    id="births-supported"
                    value={birthsSupported}
                    onChange={(e) => setBirthsSupported(e.target.value)}
                    placeholder="e.g. 50+"
                  />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Your Roles</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getRoles().map((role) => (
                    <Badge key={role} variant="secondary">{role}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Contact admin to update your roles</p>
              </div>
            </CardContent>
          </Card>

          {/* Required fields */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Required Information
              </CardTitle>
              <CardDescription>Please complete all fields below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  Profile Photo *
                </Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.profile_photo_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <label htmlFor="photo-upload">
                      <Button 
                        variant="outline" 
                        asChild 
                        disabled={uploadingPhoto}
                        className="cursor-pointer"
                      >
                        <span>
                          {uploadingPhoto ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {profile.profile_photo_url ? "Change Photo" : "Upload Photo"}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB, JPG or PNG</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio" className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  Short Bio *
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell parents a bit about yourself, your approach to care, and what makes you passionate about supporting families..."
                  className="min-h-[120px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{bio.length}/500 characters</p>
              </div>

              {/* Hourly Rate */}
              <div>
                <Label htmlFor="hourly-rate" className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  Hourly Rate (£) *
                </Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 45"
                  min="0"
                  step="0.01"
                  className="max-w-[200px]"
                />
              </div>

              {/* Doula Package Rate - only show if they are a doula */}
              {profile.is_doula && (
                <div>
                  <Label htmlFor="doula-rate" className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4" />
                    Full Birth Support Package Rate (£) *
                  </Label>
                  <Input
                    id="doula-rate"
                    type="number"
                    value={doulaPackageRate}
                    onChange={(e) => setDoulaPackageRate(e.target.value)}
                    placeholder="e.g. 1500"
                    min="0"
                    step="0.01"
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your rate for full birth support package</p>
                </div>
              )}

              {/* Insurance Expiry */}
              <div>
                <Label htmlFor="insurance-expires" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Insurance Certificate Expiry Date (as applicable)
                </Label>
                <Input
                  id="insurance-expires"
                  type="date"
                  value={insuranceExpires}
                  onChange={(e) => setInsuranceExpires(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cal.com Booking Link */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Booking Calendar
              </CardTitle>
              <CardDescription>
                Set up your free Cal.com account to let parents book video calls with you directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Setup instructions */}
              <div className="bg-accent/30 p-4 rounded-lg border border-accent space-y-3">
                <h4 className="font-semibold text-sm">Setup Instructions (required)</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>
                    <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer" className="text-primary underline">Sign up for a free Cal.com account</a> and set your availability
                  </li>
                  <li>
                    Go to <strong>Event Types</strong> → select your event → <strong>Location</strong> → choose <strong>"Cal Video"</strong> as the conferencing app
                  </li>
                  <li>
                    This is <strong>mandatory</strong> — all Birth Rebel calls must use Cal Video so parents have a consistent, reliable experience
                  </li>
                  <li>
                    Copy your booking link (e.g. <span className="font-mono text-xs">cal.com/your-name/30min</span>) and paste it below
                  </li>
                </ol>
              </div>

              {/* Link input */}
              <div>
                <Label htmlFor="cal-link">Cal.com Booking URL</Label>
                <Input
                  id="cal-link"
                  value={calLink}
                  onChange={(e) => setCalLink(e.target.value)}
                  placeholder="e.g. https://cal.com/your-name/30min"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste your Cal.com event link here. Make sure Cal Video is set as the conferencing app.
                </p>
              </div>

              {calLink && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">Booking link set — parents will see a "Schedule a Call" button with Cal Video</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe Connect */}
          <StripeConnectCard />

          {/* Documents - Upload Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Your Documents
              </CardTitle>
              <CardDescription>Upload or update your certificates and documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <DocumentUpload
                  caregiverId={profile.id}
                  documentType="training"
                  label="Training Certificate"
                  currentUrl={profile.training_certificate_url}
                  expiryDate={null}
                  onUploadComplete={(url) => setProfile({ ...profile, training_certificate_url: url })}
                  showExpiryInput={false}
                />
                
                <DocumentUpload
                  caregiverId={profile.id}
                  documentType="insurance"
                  label="Insurance Certificate"
                  currentUrl={profile.insurance_certificate_url}
                  expiryDate={profile.insurance_certificate_expires}
                  onUploadComplete={(url) => setProfile({ ...profile, insurance_certificate_url: url })}
                  onExpiryChange={(date) => setProfile({ ...profile, insurance_certificate_expires: date })}
                />
                
                <DocumentUpload
                  caregiverId={profile.id}
                  documentType="dbs"
                  label="DBS Certificate"
                  currentUrl={profile.dbs_certificate_url}
                  expiryDate={null}
                  onUploadComplete={(url) => setProfile({ ...profile, dbs_certificate_url: url })}
                  showExpiryInput={false}
                />
                
                <DocumentUpload
                  caregiverId={profile.id}
                  documentType="additional1"
                  label="Additional Certificate 1"
                  currentUrl={profile.additional_certificate_1_url}
                  expiryDate={null}
                  onUploadComplete={(url) => setProfile({ ...profile, additional_certificate_1_url: url })}
                  showExpiryInput={false}
                />
                
                <DocumentUpload
                  caregiverId={profile.id}
                  documentType="additional2"
                  label="Additional Certificate 2"
                  currentUrl={profile.additional_certificate_2_url}
                  expiryDate={null}
                  onUploadComplete={(url) => setProfile({ ...profile, additional_certificate_2_url: url })}
                  showExpiryInput={false}
                />

                {/* Profile Photo - View Only */}
                {profile.profile_photo_url && (
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Profile Photo</span>
                    </div>
                    <a
                      href={profile.profile_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-xs"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              size="lg"
              className="flex-1"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isProfileComplete ? "Save Changes" : "Complete Profile & Continue"}
            </Button>
            {isProfileComplete && (
              <Button 
                variant="outline" 
                onClick={() => navigate("/caregiver/matches")}
                size="lg"
              >
                Go to Matches
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CaregiverProfilePage;
