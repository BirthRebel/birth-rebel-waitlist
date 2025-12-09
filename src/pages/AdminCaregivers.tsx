import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Mail, Phone, MapPin, Clock, Heart, Globe, Briefcase, CheckCircle, Filter, X, UserPlus, MessageSquare } from "lucide-react";
import { AdminMessagePanel } from "@/components/admin/AdminMessagePanel";

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
}

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
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [inviting, setInviting] = useState(false);
  const [messagePanelCaregiver, setMessagePanelCaregiver] = useState<Caregiver | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-all-caregivers");
      
      if (error) throw error;
      
      if (data?.caregivers) {
        setCaregivers(data.caregivers as Caregiver[]);
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
                      <div className="flex items-center gap-2">
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

                        {/* Messages button */}
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
