// SEIA physical office locations (branch directory).
export type Office = {
  name: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax?: string;
  teamSize: number;
  hq?: boolean;
};

export const OFFICES: Office[] = [
  {
    name: "Century City",
    street: "2121 Avenue of the Stars",
    suite: "Suite 1600",
    city: "Century City",
    state: "CA",
    zip: "90067",
    phone: "(310) 712-2323",
    fax: "(310) 712-2345",
    teamSize: 65,
    hq: true,
  },
  {
    name: "Chicago",
    street: "875 North Michigan Avenue",
    suite: "Suite 3100",
    city: "Chicago",
    state: "IL",
    zip: "60611",
    phone: "(773) 941-7315",
    teamSize: 6,
  },
  {
    name: "Cleveland",
    street: "5885 Landerbrook Drive",
    suite: "Suite 200",
    city: "Cleveland",
    state: "OH",
    zip: "44124",
    phone: "(440) 683-9200",
    fax: "(440) 683-9100",
    teamSize: 24,
  },
  {
    name: "Denver",
    street: "2301 Blake Street",
    suite: "Suite 100",
    city: "Denver",
    state: "CO",
    zip: "80205",
    phone: "(720) 659-3356",
    fax: "(310) 712-2354",
    teamSize: 10,
  },
  {
    name: "New York",
    street: "132 West 31st Street",
    suite: "9th Floor, Office #1020",
    city: "New York",
    state: "NY",
    zip: "10001",
    phone: "(332) 208-7465",
    fax: "(703) 738-2259",
    teamSize: 6,
  },
  {
    name: "Newport Beach",
    street: "610 Newport Center Dr.",
    suite: "Suite 300",
    city: "Newport Beach",
    state: "CA",
    zip: "92660",
    phone: "(949) 705-5188",
    fax: "(949) 691-3065",
    teamSize: 19,
  },
  {
    name: "Phoenix",
    street: "2415 E Camelback Road",
    suite: "Suite 724",
    city: "Phoenix",
    state: "AZ",
    zip: "85016",
    phone: "(602) 975-0801",
    fax: "(310) 712-2345",
    teamSize: 7,
  },
];

// Approximate [longitude, latitude] per office, for the branch footprint map.
export const OFFICE_COORDS: Record<string, [number, number]> = {
  "Century City": [-118.4171, 34.0583],
  Chicago: [-87.6244, 41.8996],
  Cleveland: [-81.4404, 41.4993],
  Denver: [-104.9822, 39.7566],
  "New York": [-73.9911, 40.7484],
  "Newport Beach": [-117.8735, 33.6189],
  Phoenix: [-112.0281, 33.5094],
};

export function officeCoords(name: string): [number, number] {
  return OFFICE_COORDS[name] ?? [-98, 39];
}



export function officeMapsUrl(o: Office): string {
  const q = `${o.street}, ${o.city}, ${o.state} ${o.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function officeSlug(name: string): string {
  return encodeURIComponent(name);
}

export function findOffice(slug: string): Office | undefined {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* keep raw */
  }
  return OFFICES.find((o) => o.name.toLowerCase() === decoded.toLowerCase());
}

// Each advisor belongs to exactly ONE physical office, so advisors (and the
// leads/clients they own) never appear as duplicates across branch pages.
export const ADVISOR_OFFICE: Record<string, string> = {
  "adv-alvarez": "Century City",
  "adv-nakamura": "New York",
  "adv-whitaker": "Chicago",
  "adv-patel": "Newport Beach",
  "adv-chen": "Denver",
  "adv-obrien": "Phoenix",
};

export function officeForAdvisor(advisorId: string): Office | undefined {
  const name = ADVISOR_OFFICE[advisorId];
  return name ? OFFICES.find((o) => o.name === name) : undefined;
}

// Deterministically map a lead's "City, ST" string to the office that covers it.
export function officeForCity(cityState: string): Office {
  const [city = "", st = ""] = cityState.split(",").map((s) => s.trim());
  const byCity = OFFICES.find((o) => o.city.toLowerCase() === city.toLowerCase());
  if (byCity) return byCity;
  const byState = OFFICES.filter((o) => o.state.toLowerCase() === st.toLowerCase());
  if (byState.length > 0) {
    const idx = [...city].reduce((s, c) => s + c.charCodeAt(0), 0) % byState.length;
    return byState[idx]!;
  }
  return OFFICES.find((o) => o.hq) ?? OFFICES[0]!;
}

// A lead/client lives at exactly one office: its owning advisor's office when
// assigned, otherwise the office covering its city.
export function officeForLead(lead: { city: string; ownerId: string }): Office {
  return officeForAdvisor(lead.ownerId) ?? officeForCity(lead.city);
}


// Branch Details pages only track advisor-owned stages; upstream intake/BDO/
// PlanScout stages are excluded (they live under Source Details).
export const BRANCH_STAGES = [
  "Advisor Plan",
  "Discovery Meeting",
  "Client Won",
] as const;

export function isBranchStage(stage: string): boolean {
  return (BRANCH_STAGES as readonly string[]).includes(stage);
}
