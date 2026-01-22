import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Accordion not currently used but may be needed for future features
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Mail, Phone, MapPin, Clock, Heart, Globe, Briefcase, CheckCircle, Filter, X, UserPlus, MessageSquare, CreditCard, FileCheck, AlertTriangle, FileX, Calendar, Save, Loader2, ExternalLink, PoundSterling, ShieldCheck, ShieldX } from "lucide-react";
import { AdminMessagePanel } from "@/components/admin/AdminMessagePanel";
import { AdminDocumentUpload } from "@/components/admin/AdminDocumentUpload";

interface Caregiver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city_town: string | null;
  country: string | null;
  active: boolean;
  // Service types
  is_doula: boolean | null;
  is_private_midwife: boolean | null;
  is_lactation_consultant: boolean | null;
  is_sleep_consultant: boolean | null;
  is_hypnobirthing_coach: boolean | null;
  is_bereavement_councillor: boolean | null;
  // Services offered
  offers_birth_planning: boolean | null;
  offers_postnatal_support: boolean | null;
  offers_active_labour_support: boolean | null;
  offers_fertility_conception: boolean | null;
  offers_nutrition_support: boolean | null;
  offers_lactation_support: boolean | null;
  offers_newborn_sleep_support: boolean | null;
  offers_hypnobirthing: boolean | null;
  offers_loss_bereavement_care: boolean | null;
  // Languages
  speaks_english: boolean | null;
  speaks_french: boolean | null;
  speaks_german: boolean | null;
  speaks_spanish: boolean | null;
  speaks_italian: boolean | null;
  speaks_punjabi: boolean | null;
  speaks_urdu: boolean | null;
  speaks_arabic: boolean | null;
  speaks_bengali: boolean | null;
  speaks_gujrati: boolean | null;
  speaks_portuguese: boolean | null;
  speaks_mandarin: boolean | null;
  language_other: string | null;
  // Availability
  avail_weekdays_mornings: boolean | null;
  avail_weekdays_afternoons: boolean | null;
  avail_weekdays_evenings: boolean | null;
  avail_weekdays_overnight: boolean | null;
  avail_weekends_mornings: boolean | null;
  avail_weekends_afternoons: boolean | null;
  avail_weekends_evenings: boolean | null;
  avail_weekends_overnight: boolean | null;
  // Supported communities
  supports_solo_parents: boolean | null;
  supports_multiples: boolean | null;
  supports_families_of_colour: boolean | null;
  supports_queer_trans: boolean | null;
  supports_disabled_parents: boolean | null;
  supports_neurodivergent: boolean | null;
  supports_trauma_survivors: boolean | null;
  supports_bereavement: boolean | null;
  supports_immigrant_refugee: boolean | null;
  supports_complex_health: boolean | null;
  // Birth types
  supports_home_births: boolean | null;
  supports_water_births: boolean | null;
  supports_caesareans: boolean | null;
  supports_rebozo: boolean | null;
  // Care types
  care_antenatal_planning: boolean | null;
  care_birth_support: boolean | null;
  care_postnatal_support: boolean | null;
  care_grief_loss: boolean | null;
  care_full_spectrum: boolean | null;
  care_fertility_conception: boolean | null;
  care_feeding_lactation: boolean | null;
  care_cultural_spiritual: boolean | null;
  // Other
  years_practicing: string | null;
  births_supported: string | null;
  bio: string | null;
  hourly_rate: number | null;
  doula_package_rate: number | null;
  profile_photo_url: string | null;
  // Document URLs
  training_certificate_url: string | null;
  additional_certificate_1_url: string | null;
  additional_certificate_2_url: string | null;
  dbs_certificate_url: string | null;
  insurance_certificate_url: string | null;
  // Document expiration date (only insurance has expiry)
  insurance_certificate_expires: string | null;
  // Code of Conduct
  code_of_conduct_accepted: boolean | null;
  code_of_conduct_accepted_at: string | null;
}

// Document configuration for tracking (only insurance has expiry)
const documentConfig = [
  { key: 'training_certificate', label: 'Training Certificate', urlField: 'training_certificate_url', expiresField: null },
  { key: 'insurance_certificate', label: 'Insurance', urlField: 'insurance_certificate_url', expiresField: 'insurance_certificate_expires' },
  { key: 'dbs_certificate', label: 'DBS Certificate', urlField: 'dbs_certificate_url', expiresField: null },
  { key: 'additional_certificate_1', label: 'Additional Cert 1', urlField: 'additional_certificate_1_url', expiresField: null },
  { key: 'additional_certificate_2', label: 'Additional Cert 2', urlField: 'additional_certificate_2_url', expiresField: null },
] as const;

type DocumentStatus = 'missing' | 'expired' | 'expiring_soon' | 'valid' | 'no_expiry';

const getDocumentStatus = (url: string | null, expiresDate: string | null): DocumentStatus => {
  if (!url) return 'missing';
  if (!expiresDate) return 'no_expiry'; // Document uploaded but no expiry date set
  
  const now = new Date();
  const expires = new Date(expiresDate);
  const daysUntilExpiry = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 60) return 'expiring_soon';
  return 'valid';
};

const getDocumentStatusBadge = (status: DocumentStatus, expiresDate: string | null) => {
  switch (status) {
    case 'missing':
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/50"><FileX className="h-3 w-3 mr-1" />Not uploaded</Badge>;
    case 'expired':
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
    case 'expiring_soon':
      const days = Math.ceil((new Date(expiresDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Expires in {days}d</Badge>;
    case 'valid':
      return <Badge className="bg-green-500 hover:bg-green-600 text-white"><FileCheck className="h-3 w-3 mr-1" />Valid</Badge>;
    case 'no_expiry':
      return <Badge variant="secondary"><FileCheck className="h-3 w-3 mr-1" />Uploaded (no expiry)</Badge>;
  }
};

const getCaregiverDocumentSummary = (caregiver: Caregiver) => {
  let hasIssues = false;
  let expiringSoon = 0;
  let expired = 0;
  let missing = 0;
  
  // Only check Insurance and DBS as required documents
  const requiredDocs = ['insurance_certificate', 'dbs_certificate'] as const;
  
  for (const docKey of requiredDocs) {
    const url = caregiver[`${docKey}_url` as keyof Caregiver] as string | null;
    const expires = caregiver[`${docKey}_expires` as keyof Caregiver] as string | null;
    const status = getDocumentStatus(url, expires);
    
    if (status === 'expired') { expired++; hasIssues = true; }
    if (status === 'expiring_soon') { expiringSoon++; hasIssues = true; }
    if (status === 'missing') { missing++; }
  }
  
  return { hasIssues, expiringSoon, expired, missing };
};

const fieldGroups = {
  serviceTypes: {
    label: "Service Type",
    icon: Briefcase,
    fields: {
      is_doula: "Doula",
      is_private_midwife: "Private Midwife",
      is_lactation_consultant: "Lactation Consultant",
      is_sleep_consultant: "Sleep Consultant",
      is_hypnobirthing_coach: "Hypnobirthing Coach",
      is_bereavement_councillor: "Bereavement Councillor",
    },
  },
  servicesOffered: {
    label: "Services Offered",
    icon: Heart,
    fields: {
      offers_birth_planning: "Birth Planning",
      offers_postnatal_support: "Postnatal Support",
      offers_active_labour_support: "Active Labour Support",
      offers_fertility_conception: "Fertility & Conception",
      offers_nutrition_support: "Nutrition Support",
      offers_lactation_support: "Lactation Support",
      offers_newborn_sleep_support: "Newborn Sleep Support",
      offers_hypnobirthing: "Hypnobirthing",
      offers_loss_bereavement_care: "Loss & Bereavement Care",
    },
  },
  languages: {
    label: "Languages",
    icon: Globe,
    fields: {
      speaks_english: "English",
      speaks_french: "French",
      speaks_german: "German",
      speaks_spanish: "Spanish",
      speaks_italian: "Italian",
      speaks_punjabi: "Punjabi",
      speaks_urdu: "Urdu",
      speaks_arabic: "Arabic",
      speaks_bengali: "Bengali",
      speaks_gujrati: "Gujarati",
      speaks_portuguese: "Portuguese",
      speaks_mandarin: "Mandarin",
    },
  },
  availability: {
    label: "Availability",
    icon: Clock,
    fields: {
      avail_weekdays_mornings: "Weekdays - Mornings",
      avail_weekdays_afternoons: "Weekdays - Afternoons",
      avail_weekdays_evenings: "Weekdays - Evenings",
      avail_weekdays_overnight: "Weekdays - Overnight",
      avail_weekends_mornings: "Weekends - Mornings",
      avail_weekends_afternoons: "Weekends - Afternoons",
      avail_weekends_evenings: "Weekends - Evenings",
      avail_weekends_overnight: "Weekends - Overnight",
    },
  },
  supportedCommunities: {
    label: "Supported Communities",
    icon: Heart,
    fields: {
      supports_solo_parents: "Solo Parents",
      supports_multiples: "Multiples (Twins/Triplets)",
      supports_families_of_colour: "Families of Colour",
      supports_queer_trans: "LGBTQ+ Families",
      supports_disabled_parents: "Disabled Parents",
      supports_neurodivergent: "Neurodivergent Parents",
      supports_trauma_survivors: "Trauma Survivors",
      supports_bereavement: "Bereavement",
      supports_immigrant_refugee: "Immigrant/Refugee Families",
      supports_complex_health: "Complex Health Needs",
    },
  },
  birthTypes: {
    label: "Birth Types Supported",
    icon: CheckCircle,
    fields: {
      supports_home_births: "Home Births",
      supports_water_births: "Water Births",
      supports_caesareans: "Caesareans",
      supports_rebozo: "Rebozo",
    },
  },
  careTypes: {
    label: "Care Types",
    icon: Heart,
    fields: {
      care_antenatal_planning: "Antenatal Planning",
      care_birth_support: "Birth Support",
      care_postnatal_support: "Postnatal Support",
      care_grief_loss: "Grief & Loss",
      care_full_spectrum: "Full Spectrum",
      care_fertility_conception: "Fertility & Conception",
      care_feeding_lactation: "Feeding & Lactation",
      care_cultural_spiritual: "Cultural & Spiritual",
    },
  },
};

const getTrueValues = (caregiver: Caregiver, fields: Record<string, string>): string[] => {
  return Object.entries(fields)
    .filter(([key]) => caregiver[key as keyof Caregiver] === true)
    .map(([, label]) => label);
};

type FilterState = Record<string, string[]>;

const FilterPopover = ({
  groupKey,
  group,
  filters,
  onFilterChange,
}: {
  groupKey: string;
  group: { label: string; icon: React.ElementType; fields: Record<string, string> };
  filters: FilterState;
  onFilterChange: (groupKey: string, fieldKey: string, checked: boolean) => void;
}) => {
  const Icon = group.icon;
  const activeCount = filters[groupKey]?.length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Icon className="h-4 w-4" />
          {group.label}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(group.fields).map(([fieldKey, label]) => (
            <label
              key={fieldKey}
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded"
            >
              <Checkbox
                checked={filters[groupKey]?.includes(fieldKey) || false}
                onCheckedChange={(checked) =>
                  onFilterChange(groupKey, fieldKey, checked as boolean)
                }
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const AdminCaregivers = () => {
  const [searchParams] = useSearchParams();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [inviting, setInviting] = useState(false);
  const [messagePanelCaregiver, setMessagePanelCaregiver] = useState<Caregiver | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<Record<string, { subscribed: boolean; subscription_end?: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Caregiver>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const startEditing = (caregiver: Caregiver) => {
    setEditingId(caregiver.id);
    setEditForm({
      first_name: caregiver.first_name,
      last_name: caregiver.last_name,
      phone: caregiver.phone,
      city_town: caregiver.city_town,
      country: caregiver.country,
      years_practicing: caregiver.years_practicing,
      births_supported: caregiver.births_supported,
      bio: caregiver.bio,
      hourly_rate: caregiver.hourly_rate,
      doula_package_rate: caregiver.doula_package_rate,
      insurance_certificate_expires: caregiver.insurance_certificate_expires,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveCaregiver = async (caregiverId: string) => {
    setSavingId(caregiverId);
    try {
      const { error } = await supabase
        .from("caregivers")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          city_town: editForm.city_town,
          country: editForm.country,
          years_practicing: editForm.years_practicing,
          births_supported: editForm.births_supported,
          bio: editForm.bio,
          hourly_rate: editForm.hourly_rate ? parseFloat(String(editForm.hourly_rate)) : null,
          doula_package_rate: editForm.doula_package_rate ? parseFloat(String(editForm.doula_package_rate)) : null,
          insurance_certificate_expires: editForm.insurance_certificate_expires || null,
        })
        .eq("id", caregiverId);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Caregiver details updated successfully.",
      });

      // Refresh data
      fetchCaregivers();
      setEditingId(null);
      setEditForm({});
    } catch (err: any) {
      toast({
        title: "Error saving",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const fetchSubscriptionStatus = async (emails: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("check-caregiver-subscription", {
        body: { emails },
      });
      if (error) throw error;
      if (data?.subscriptions) {
        setSubscriptionStatus(data.subscriptions);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-all-caregivers");
      
      if (error) throw error;
      
      if (data?.caregivers) {
        const caregiverList = data.caregivers as Caregiver[];
        setCaregivers(caregiverList);
        
        // Fetch subscription status for all caregivers
        const emails = caregiverList.map((c) => c.email);
        if (emails.length > 0) {
          fetchSubscriptionStatus(emails);
        }
      }
    } catch (error) {
      console.error("Error fetching caregivers:", error);
    }
    setIsLoading(false);
  };

  const handleFilterChange = (groupKey: string, fieldKey: string, checked: boolean) => {
    setFilters((prev) => {
      const current = prev[groupKey] || [];
      if (checked) {
        return { ...prev, [groupKey]: [...current, fieldKey] };
      } else {
        return { ...prev, [groupKey]: current.filter((k) => k !== fieldKey) };
      }
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  const filteredCaregivers = caregivers.filter((c) => {
    // Text search
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      !search ||
      c.email.toLowerCase().includes(search) ||
      c.first_name?.toLowerCase().includes(search) ||
      c.last_name?.toLowerCase().includes(search) ||
      c.city_town?.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    // Apply filters - caregiver must match ALL selected filters within each group
    for (const [groupKey, selectedFields] of Object.entries(filters)) {
      if (selectedFields.length === 0) continue;
      
      // Check if caregiver has at least one of the selected fields in this group
      const hasMatch = selectedFields.some(
        (fieldKey) => c[fieldKey as keyof Caregiver] === true
      );
      if (!hasMatch) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-48 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Caregivers</h1>
              <p className="text-muted-foreground">
                {filteredCaregivers.length} of {caregivers.length} caregivers
              </p>
            </div>
            <Button 
              onClick={async () => {
                setInviting(true);
                try {
                  const { data, error } = await supabase.functions.invoke("invite-caregivers", {
                    body: { invite_all: true },
                  });
                  
                  if (error) throw error;
                  
                  toast({
                    title: "Invitations sent",
                    description: `${data.invited} caregivers invited. ${data.errors?.length || 0} errors.`,
                  });
                  
                  if (data.errors?.length > 0) {
                    console.log("Invite errors:", data.errors);
                  }
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                  });
                } finally {
                  setInviting(false);
                }
              }}
              disabled={inviting}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {inviting ? "Inviting..." : "Invite All Caregivers"}
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {Object.entries(fieldGroups).map(([key, group]) => (
                <FilterPopover
                  key={key}
                  groupKey={key}
                  group={group}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              ))}
              {(activeFilterCount > 0 || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 gap-1 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredCaregivers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No caregivers found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCaregivers.map((caregiver) => (
                <Card key={caregiver.id} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === caregiver.id ? null : caregiver.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {caregiver.first_name || caregiver.last_name
                              ? `${caregiver.first_name || ""} ${caregiver.last_name || ""}`.trim()
                              : "Unnamed"}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {caregiver.email}
                            </span>
                            {caregiver.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {caregiver.phone}
                              </span>
                            )}
                            {caregiver.city_town && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {caregiver.city_town}
                                {caregiver.country && `, ${caregiver.country}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Document status warning badges */}
                        {(() => {
                          const docSummary = getCaregiverDocumentSummary(caregiver);
                          return (
                            <>
                              {docSummary.expired > 0 && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {docSummary.expired} Expired
                                </Badge>
                              )}
                              {docSummary.expiringSoon > 0 && (
                                <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {docSummary.expiringSoon} Expiring
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                        {subscriptionStatus[caregiver.email]?.subscribed && (
                          <Badge className="bg-green-500 text-white hover:bg-green-600">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Subscribed
                          </Badge>
                        )}
                        {caregiver.code_of_conduct_accepted ? (
                          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            CoC Accepted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500">
                            <ShieldX className="h-3 w-3 mr-1" />
                            CoC Pending
                          </Badge>
                        )}
                        {caregiver.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {caregiver.years_practicing && (
                          <Badge variant="outline">{caregiver.years_practicing} years</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedId === caregiver.id && (
                    <CardContent className="border-t pt-6">
                      {/* Edit/View Toggle Button */}
                      <div className="flex justify-end mb-4">
                        {editingId === caregiver.id ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEditing();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveCaregiver(caregiver.id);
                              }}
                              disabled={savingId === caregiver.id}
                            >
                              {savingId === caregiver.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Save Changes
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(caregiver);
                            }}
                          >
                            Edit Details
                          </Button>
                        )}
                      </div>

                      {/* Editable Personal Info Section */}
                      {editingId === caregiver.id ? (
                        <div className="bg-muted/30 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-sm flex items-center gap-2 text-foreground mb-4">
                            <User className="h-4 w-4 text-primary" />
                            Personal Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`first_name_${caregiver.id}`}>First Name</Label>
                              <Input
                                id={`first_name_${caregiver.id}`}
                                value={editForm.first_name || ""}
                                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`last_name_${caregiver.id}`}>Last Name</Label>
                              <Input
                                id={`last_name_${caregiver.id}`}
                                value={editForm.last_name || ""}
                                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`phone_${caregiver.id}`}>Phone</Label>
                              <Input
                                id={`phone_${caregiver.id}`}
                                value={editForm.phone || ""}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`city_${caregiver.id}`}>City/Town</Label>
                              <Input
                                id={`city_${caregiver.id}`}
                                value={editForm.city_town || ""}
                                onChange={(e) => setEditForm({ ...editForm, city_town: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`country_${caregiver.id}`}>Country</Label>
                              <Input
                                id={`country_${caregiver.id}`}
                                value={editForm.country || ""}
                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`years_${caregiver.id}`}>Years Practicing</Label>
                              <Input
                                id={`years_${caregiver.id}`}
                                value={editForm.years_practicing || ""}
                                onChange={(e) => setEditForm({ ...editForm, years_practicing: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`births_${caregiver.id}`}>Births Supported</Label>
                              <Input
                                id={`births_${caregiver.id}`}
                                value={editForm.births_supported || ""}
                                onChange={(e) => setEditForm({ ...editForm, births_supported: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`hourly_${caregiver.id}`}>Hourly Rate (£)</Label>
                              <Input
                                id={`hourly_${caregiver.id}`}
                                type="number"
                                value={editForm.hourly_rate || ""}
                                onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value ? parseFloat(e.target.value) : null })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`package_${caregiver.id}`}>Doula Package Rate (£)</Label>
                              <Input
                                id={`package_${caregiver.id}`}
                                type="number"
                                value={editForm.doula_package_rate || ""}
                                onChange={(e) => setEditForm({ ...editForm, doula_package_rate: e.target.value ? parseFloat(e.target.value) : null })}
                              />
                            </div>
                            <div className="col-span-full">
                              <Label htmlFor={`bio_${caregiver.id}`}>Bio</Label>
                              <Textarea
                                id={`bio_${caregiver.id}`}
                                value={editForm.bio || ""}
                                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                className="min-h-[100px]"
                              />
                            </div>
                          </div>
                          {/* Document Expiry Dates */}
                          <h4 className="font-medium text-sm flex items-center gap-2 text-foreground mt-6 mb-4">
                            <Calendar className="h-4 w-4 text-primary" />
                            Document Expiry Dates
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`insurance_exp_${caregiver.id}`}>Insurance Expires</Label>
                              <Input
                                id={`insurance_exp_${caregiver.id}`}
                                type="date"
                                value={editForm.insurance_certificate_expires || ""}
                                onChange={(e) => setEditForm({ ...editForm, insurance_certificate_expires: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* View Mode - Rates & Bio Display */
                        <div className="bg-muted/30 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-sm flex items-center gap-2 text-foreground mb-3">
                            <PoundSterling className="h-4 w-4 text-primary" />
                            Rates & Bio
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div>
                              <span className="text-xs text-muted-foreground">Hourly Rate</span>
                              <p className="font-medium">{caregiver.hourly_rate ? `£${caregiver.hourly_rate}` : "Not set"}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Doula Package Rate</span>
                              <p className="font-medium">{caregiver.doula_package_rate ? `£${caregiver.doula_package_rate}` : "Not set"}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Profile Photo</span>
                              <p className="font-medium">
                                {caregiver.profile_photo_url ? (
                                  <a href={caregiver.profile_photo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    View <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : "Not uploaded"}
                              </p>
                            </div>
                          </div>
                          {caregiver.bio && (
                            <div>
                              <span className="text-xs text-muted-foreground">Bio</span>
                              <p className="text-sm mt-1">{caregiver.bio}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(fieldGroups).map(([key, group]) => {
                          const values = getTrueValues(caregiver, group.fields);
                          if (values.length === 0) return null;

                          const Icon = group.icon;
                          return (
                            <div key={key} className="space-y-2">
                              <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                                <Icon className="h-4 w-4 text-primary" />
                                {group.label}
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {values.map((value) => (
                                  <Badge
                                    key={value}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Other languages */}
                        {caregiver.language_other && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                              <Globe className="h-4 w-4 text-primary" />
                              Other Languages
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {caregiver.language_other}
                            </p>
                          </div>
                        )}

                        {/* Births supported */}
                        {caregiver.births_supported && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                              <Heart className="h-4 w-4 text-primary" />
                              Births Supported
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {caregiver.births_supported}
                            </p>
                          </div>
                        )}

                        {/* Documents Section - Admin Upload */}
                        <div className="col-span-full border-t pt-4 mt-4">
                          <h4 className="font-medium text-sm flex items-center gap-2 text-foreground mb-3">
                            <FileCheck className="h-4 w-4 text-primary" />
                            Documents & Certifications (Admin Upload)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <AdminDocumentUpload
                              caregiverId={caregiver.id}
                              documentType="training"
                              label="Training"
                              currentUrl={caregiver.training_certificate_url}
                              expiryDate={null}
                              onUploadComplete={fetchCaregivers}
                            />
                            <AdminDocumentUpload
                              caregiverId={caregiver.id}
                              documentType="insurance"
                              label="Insurance"
                              currentUrl={caregiver.insurance_certificate_url}
                              expiryDate={caregiver.insurance_certificate_expires}
                              onUploadComplete={fetchCaregivers}
                            />
                            <AdminDocumentUpload
                              caregiverId={caregiver.id}
                              documentType="dbs"
                              label="DBS"
                              currentUrl={caregiver.dbs_certificate_url}
                              expiryDate={null}
                              onUploadComplete={fetchCaregivers}
                            />
                            <AdminDocumentUpload
                              caregiverId={caregiver.id}
                              documentType="additional1"
                              label="Additional 1"
                              currentUrl={caregiver.additional_certificate_1_url}
                              expiryDate={null}
                              onUploadComplete={fetchCaregivers}
                            />
                            <AdminDocumentUpload
                              caregiverId={caregiver.id}
                              documentType="additional2"
                              label="Additional 2"
                              currentUrl={caregiver.additional_certificate_2_url}
                              expiryDate={null}
                              onUploadComplete={fetchCaregivers}
                            />
                          </div>
                        </div>
                        <div className="pt-4 border-t mt-4">
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMessagePanelCaregiver(caregiver);
                            }}
                            className="gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            View Messages
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Message side panel */}
      <AdminMessagePanel
        isOpen={!!messagePanelCaregiver}
        onClose={() => setMessagePanelCaregiver(null)}
        caregiverId={messagePanelCaregiver?.id}
        caregiverName={
          messagePanelCaregiver
            ? `${messagePanelCaregiver.first_name || ""} ${messagePanelCaregiver.last_name || ""}`.trim() || "Caregiver"
            : undefined
        }
        caregiverEmail={messagePanelCaregiver?.email}
      />
    </div>
  );
};

export default AdminCaregivers;
