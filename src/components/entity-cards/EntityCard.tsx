import React from "react";

export type EntityBase = {
  id?: string;
  type: "person" | "organization" | "place" | "college" | "product" | "thing";
  name: string;
  url?: string;
  image?: string;
  description?: string;
};

export type PersonEntity = EntityBase & {
  type: "person";
  fullName?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  citizenship?: string | string[];
  nationality?: string | string[];
  spouse?: string | string[];
  parents?: string | string[];
  relatives?: string[];
  education?: Array<{ institution: string; degree?: string; year?: string }>;
  occupation?: string[];
  knownFor?: string[];
  websites?: string[];
  socials?: Array<{ label: string; url: string }>;
  contact?: Array<{ label: string; value: string; url?: string }>;
};

export type OrganizationEntity = EntityBase & {
  type: "organization";
  founded?: string;
  founders?: string[];
  headquarters?: string;
  industry?: string[];
  website?: string;
  employees?: string;
  ticker?: string;
  keyPeople?: string[];
};

export type PlaceEntity = EntityBase & {
  type: "place";
  country?: string;
  region?: string;
  population?: string;
  area?: string;
  coordinates?: string;
  timezone?: string;
  founded?: string;
  mayor?: string;
  landmarks?: string[];
};

export type CollegeEntity = EntityBase & {
  type: "college";
  founded?: string;
  location?: string;
  website?: string;
  typeOfInstitution?: string;
  acceptanceRate?: string;
  tuition?: string;
  enrollment?: string;
  notableAlumni?: string[];
  programs?: string[];
};

export type AnyEntity =
  | PersonEntity
  | OrganizationEntity
  | PlaceEntity
  | CollegeEntity
  | (EntityBase & Record<string, any>);

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed">
      <span className="text-foreground/60 min-w-[88px] select-none">
        {label}
      </span>
      <div className="flex-1 text-foreground/90">{value}</div>
    </div>
  );
}

function Badge({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  const content = (
    <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[11px] whitespace-nowrap hover:bg-white/10">
      {children}
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}

export function PersonCard({ e }: { e: PersonEntity }) {
  const img = e.image;
  const name = e.fullName || e.name;
  const arr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden">
      <div className="flex gap-4 p-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-white/10 flex-shrink-0">
          {img ? (
            <img src={img} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-foreground/60">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-lg font-semibold leading-tight">{name}</h3>
            {e.url && (
              <a
                className="ml-auto text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 hover:bg-white/15"
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Profile
              </a>
            )}
          </div>
          {e.description && (
            <p className="mt-1 text-sm text-foreground/80 line-clamp-3">
              {e.description}
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field
              label="Born"
              value={
                (e.birthDate || e.birthPlace) && (
                  <span>
                    {e.birthDate ? <span>{e.birthDate}</span> : null}
                    {e.birthDate && e.birthPlace ? <span> — </span> : null}
                    {e.birthPlace ? <span>{e.birthPlace}</span> : null}
                  </span>
                )
              }
            />
            <Field label="Died" value={e.deathDate} />
            <Field label="Citizenship" value={arr(e.citizenship).join(", ")} />
            <Field label="Nationality" value={arr(e.nationality).join(", ")} />
            <Field label="Spouse" value={arr(e.spouse).join(", ")} />
            <Field label="Parents" value={arr(e.parents).join(", ")} />
            <Field label="Relatives" value={arr(e.relatives).join(", ")} />
            <Field
              label="Occupation"
              value={arr(e.occupation).map((x, i) => (
                <Badge key={i}>{x}</Badge>
              ))}
            />
            <Field
              label="Known for"
              value={arr(e.knownFor).map((x, i) => (
                <Badge key={i}>{x}</Badge>
              ))}
            />
            <Field
              label="Education"
              value={
                e.education?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {e.education.map((ed, i) => (
                      <Badge key={i}>
                        {ed.institution}
                        {ed.degree ? ` — ${ed.degree}` : ""}
                        {ed.year ? ` (${ed.year})` : ""}
                      </Badge>
                    ))}
                  </div>
                ) : undefined
              }
            />
            <Field
              label="Websites"
              value={
                e.websites?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {e.websites.map((u, i) => (
                      <Badge href={u} key={i}>
                        {new URL(u).hostname.replace(/^www\./, "")}
                      </Badge>
                    ))}
                  </div>
                ) : undefined
              }
            />
            <Field
              label="Contact"
              value={
                e.contact?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {e.contact.map((c, i) => (
                      <Badge href={c.url} key={i}>
                        {c.label}: {c.value}
                      </Badge>
                    ))}
                  </div>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrganizationCard({ e }: { e: OrganizationEntity }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center">
          {e.image ? (
            <img
              src={e.image}
              alt={e.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-sm text-foreground/60">Logo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold leading-tight">{e.name}</h3>
            {e.website && (
              <a
                className="ml-auto text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 hover:bg-white/15"
                href={e.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            )}
          </div>
          {e.description && (
            <p className="mt-1 text-sm text-foreground/80 line-clamp-3">
              {e.description}
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Founded" value={e.founded} />
            <Field label="Founders" value={e.founders?.join(", ")} />
            <Field label="Headquarters" value={e.headquarters} />
            <Field label="Industry" value={e.industry?.join(", ")} />
            <Field label="Employees" value={e.employees} />
            <Field label="Ticker" value={e.ticker} />
            <Field label="Key people" value={e.keyPeople?.join(", ")} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlaceCard({ e }: { e: PlaceEntity }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center">
          {e.image ? (
            <img
              src={e.image}
              alt={e.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm text-foreground/60">Map</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-tight">{e.name}</h3>
          {e.description && (
            <p className="mt-1 text-sm text-foreground/80 line-clamp-3">
              {e.description}
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Country" value={e.country} />
            <Field label="Region" value={e.region} />
            <Field label="Population" value={e.population} />
            <Field label="Area" value={e.area} />
            <Field label="Coordinates" value={e.coordinates} />
            <Field label="Timezone" value={e.timezone} />
            <Field label="Founded" value={e.founded} />
            <Field label="Mayor" value={e.mayor} />
            <Field label="Landmarks" value={e.landmarks?.join(", ")} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollegeCard({ e }: { e: CollegeEntity }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center">
          {e.image ? (
            <img
              src={e.image}
              alt={e.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm text-foreground/60">Campus</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold leading-tight">{e.name}</h3>
            {e.website && (
              <a
                className="ml-auto text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 hover:bg-white/15"
                href={e.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            )}
          </div>
          {e.description && (
            <p className="mt-1 text-sm text-foreground/80 line-clamp-3">
              {e.description}
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Founded" value={e.founded} />
            <Field label="Location" value={e.location} />
            <Field label="Type" value={e.typeOfInstitution} />
            <Field label="Acceptance rate" value={e.acceptanceRate} />
            <Field label="Tuition" value={e.tuition} />
            <Field label="Enrollment" value={e.enrollment} />
            <Field label="Programs" value={e.programs?.join(", ")} />
            <Field label="Notable alumni" value={e.notableAlumni?.join(", ")} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EntityCard({ entity }: { entity: AnyEntity }) {
  if (entity.type === "person")
    return <PersonCard e={entity as PersonEntity} />;
  if (entity.type === "organization")
    return <OrganizationCard e={entity as OrganizationEntity} />;
  if (entity.type === "place") return <PlaceCard e={entity as PlaceEntity} />;
  if (entity.type === "college")
    return <CollegeCard e={entity as CollegeEntity} />;
  // Generic fallback
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden p-4">
      <h3 className="text-lg font-semibold mb-1">{entity.name}</h3>
      {entity.description && (
        <p className="text-sm text-foreground/80">{entity.description}</p>
      )}
    </div>
  );
}
