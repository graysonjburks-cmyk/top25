// Offline 2025 reference directory. Review season membership against authoritative sources before live use. Original text badges, no licensed logos.
const conferences: Record<string, string> = {
  SEC: "Alabama|Arkansas|Auburn|Florida|Georgia|Kentucky|LSU|Mississippi State|Missouri|Oklahoma|Ole Miss|South Carolina|Tennessee|Texas|Texas A&M|Vanderbilt",
  "Big Ten":
    "Illinois|Indiana|Iowa|Maryland|Michigan|Michigan State|Minnesota|Nebraska|Northwestern|Ohio State|Oregon|Penn State|Purdue|Rutgers|UCLA|USC|Washington|Wisconsin",
  ACC: "Boston College|California|Clemson|Duke|Florida State|Georgia Tech|Louisville|Miami|NC State|North Carolina|Pittsburgh|SMU|Stanford|Syracuse|Virginia|Virginia Tech|Wake Forest",
  "Big 12":
    "Arizona|Arizona State|Baylor|BYU|Cincinnati|Colorado|Houston|Iowa State|Kansas|Kansas State|Oklahoma State|TCU|Texas Tech|UCF|Utah|West Virginia",
  "Pac-12":
    "Boise State|Colorado State|Fresno State|Oregon State|San Diego State|Texas State|Utah State|Washington State",
  American:
    "Army|Charlotte|East Carolina|Florida Atlantic|Memphis|Navy|North Texas|Rice|South Florida|Temple|Tulane|Tulsa|UAB|UTSA",
  "Sun Belt":
    "Appalachian State|Arkansas State|Coastal Carolina|Georgia Southern|Georgia State|James Madison|Louisiana|Louisiana-Monroe|Marshall|Old Dominion|South Alabama|Southern Miss|Troy",
  MAC: "Akron|Ball State|Bowling Green|Buffalo|Central Michigan|Eastern Michigan|Kent State|Massachusetts|Miami (OH)|Ohio|Toledo|Western Michigan|Sacramento State",
  "Conference USA":
    "Delaware|FIU|Jacksonville State|Kennesaw State|Liberty|Louisiana Tech|Middle Tennessee|Missouri State|New Mexico State|Sam Houston|Western Kentucky",
  "Mountain West":
    "Air Force|Hawaii|Nevada|New Mexico|Northern Illinois|North Dakota State|San Jose State|UNLV|UTEP|Wyoming",
  Independent: "Notre Dame|UConn",
};
export type Team = {
  id: string;
  name: string;
  conference: string;
  initials: string;
  color: string;
};
const colors: Record<string, string> = {
  Georgia: "#b71936",
  "Ohio State": "#bb2638",
  Texas: "#bf5700",
  Oregon: "#136b45",
  Alabama: "#9e1b32",
  "Notre Dame": "#263e69",
  "Penn State": "#163c65",
  Tennessee: "#e97600",
  Miami: "#087852",
  Clemson: "#e65d24",
  LSU: "#633b88",
  "Ole Miss": "#b51b37",
};
const referenceTeams: Team[] = Object.entries(conferences).flatMap(
  ([conference, names]) =>
    names.split("|").map((name) => ({
      id: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, ""),
      name,
      conference,
      initials:
        name === "Ohio State"
          ? "OSU"
          : name === "Notre Dame"
            ? "ND"
            : name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 3)
                .toUpperCase(),
      color:
        colors[name] ||
        ["#244e72", "#8c293b", "#386047", "#6d4a80"][name.length % 4],
    })),
);
export const teams: Team[] = referenceTeams
  .filter((t) => !["north-dakota-state", "sacramento-state"].includes(t.id))
  .map((t) => ({
    ...t,
    conference:
      t.id === "texas-state"
        ? "Sun Belt"
        : t.id === "utep"
          ? "Conference USA"
          : t.id === "northern-illinois"
            ? "MAC"
            : [
                  "boise-state",
                  "colorado-state",
                  "fresno-state",
                  "san-diego-state",
                  "utah-state",
                ].includes(t.id)
              ? "Mountain West"
              : t.conference,
  }));
export const teamById = new Map(teams.map((t) => [t.id, t]));
export const sampleOrder = [
  "georgia",
  "ohio-state",
  "texas",
  "oregon",
  "alabama",
  "notre-dame",
  "penn-state",
  "tennessee",
  "miami",
  "clemson",
  "lsu",
  "ole-miss",
  "utah",
  "kansas-state",
  "oklahoma",
  "michigan",
  "usc",
  "texas-a-m",
  "florida-state",
  "louisville",
  "iowa",
  "oklahoma-state",
  "arizona",
  "boise-state",
  "nc-state",
];

// Restore 2025 affiliations. Later seasons require a verified directory import.
export const referenceSeason = 2025;
export const directorySource =
  "https://www.ncaa.org/sports/2021/5/3/membership-directory.aspx";
