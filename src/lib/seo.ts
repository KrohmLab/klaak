// Données structurées (schema.org) générées depuis src/data/. Seules les dates dont le lieu et la ville sont
// connus deviennent des Event : on ne publie jamais une information devinée.
import { bio, dates, site } from "./content";

export function structuredData() {
  const artist = {
    "@type": "MusicGroup",
    "@id": `${site.url}/#klaak`,
    name: site.name,
    url: site.url,
    image: `${site.url}/og.png`,
    genre: ["Hitech", "Psytrance"],
    description: bio.fr,
    sameAs: Object.values(site.links),
    memberOf: { "@type": "Organization", name: site.collective, address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: "FR" } },
  };
  const events = dates
    .filter((date) => date.venue && date.city)
    .map((date) => ({
      "@type": "MusicEvent",
      name: date.event,
      startDate: date.start,
      endDate: date.end,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: date.venue, address: { "@type": "PostalAddress", addressLocality: date.city, addressCountry: "FR" } },
      performer: { "@id": artist["@id"] },
      ...(date.organizer ? { organizer: { "@type": "Organization", name: date.organizer } } : {}),
      ...(date.link ? { url: date.link } : {}),
    }));
  return { "@context": "https://schema.org", "@graph": [artist, ...events] };
}
