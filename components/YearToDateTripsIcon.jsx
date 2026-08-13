import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiExternalLink, FiFolder } from "react-icons/fi";

const GROUP_MOM_FOLDERS = {
  A: "https://drive.google.com/drive/folders/166dZWumx0-fqaeVtreRKrY5Kn7VHVkfm?usp=drive_link",
  B: "https://drive.google.com/drive/folders/1abqSeyjYoYYmRFhvbfzfldpPhy_vSHeQ?usp=drive_link",
  C: "https://drive.google.com/drive/folders/1uNvxet8ED945TIv6Dj-epkpICAhGS6lQ?usp=drive_link",
};

function parseTripDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const parts = raw
    .replace(/[.-]/g, "/")
    .split("/")
    .map((part) => Number(part.trim()));

  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;

  const [first, second, third] = parts;
  const year = first > 999 ? first : third;
  const month = second;
  const day = first > 999 ? third : first;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, time: date.getTime() };
}

function companyKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export default function YearToDateTripsIcon({ trips, referenceDate, groupKey }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const normalizedGroupKey = String(groupKey || "").trim().toUpperCase();
  const momFolderUrl = GROUP_MOM_FOLDERS[normalizedGroupKey];

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const summary = useMemo(() => {
    const datedTrips = (Array.isArray(trips) ? trips : [])
      .map((trip) => ({ trip, parsed: parseTripDate(trip?.date) }))
      .filter((item) => item.parsed);
    const referenceYear =
      parseTripDate(referenceDate)?.year ||
      datedTrips.reduce((max, item) => Math.max(max, item.parsed.year), 0) ||
      new Date().getFullYear();
    const yearTrips = datedTrips.filter((item) => item.parsed.year === referenceYear);
    const byCompany = new Map();

    yearTrips.forEach(({ trip, parsed }) => {
      const label = String(trip.company_name || "Unknown destination").trim();
      const key = companyKey(label) || "unknown destination";
      const current = byCompany.get(key) || {
        company_name: label || "Unknown destination",
        visits: 0,
        lastDate: "",
        lastDateMs: 0,
        owners: new Set(),
      };

      current.visits += 1;
      if (parsed.time >= current.lastDateMs) {
        current.lastDateMs = parsed.time;
        current.lastDate = trip.date;
      }
      String(trip.owner || "")
        .split("/")
        .map((owner) => owner.trim())
        .filter(Boolean)
        .forEach((owner) => current.owners.add(owner));
      byCompany.set(key, current);
    });

    const destinations = Array.from(byCompany.values())
      .map((item) => ({ ...item, owners: Array.from(item.owners) }))
      .sort(
        (a, b) =>
          b.lastDateMs - a.lastDateMs ||
          b.visits - a.visits ||
          a.company_name.localeCompare(b.company_name),
      );

    return { year: referenceYear, totalTrips: yearTrips.length, destinations };
  }, [referenceDate, trips]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        title="Year-to-date trip summary"
        aria-label="Open year-to-date trip summary"
        style={{
          width: 32,
          minWidth: 32,
          height: 32,
          padding: 0,
          borderRadius: 999,
          border: "1px solid rgba(13,148,136,0.4)",
          background: "rgba(240,253,250,0.95)",
          color: "#0f766e",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <FiCalendar size={15} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.16)",
              zIndex: 2147483646,
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Trips year to date ${summary.year}`}
            style={{
              position: "fixed",
              top: isMobile ? 24 : 72,
              left: isMobile ? 12 : "auto",
              right: isMobile ? 12 : 40,
              width: isMobile ? "auto" : 480,
              maxWidth: isMobile ? "calc(100vw - 24px)" : 560,
              maxHeight: isMobile ? "calc(100vh - 48px)" : "calc(100vh - 144px)",
              background: "#ffffff",
              borderRadius: 18,
              boxShadow: "0 24px 70px rgba(15,23,42,0.28), 0 0 0 1px rgba(148,163,184,0.4)",
              padding: 16,
              zIndex: 2147483647,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 850, color: "#0f172a" }}>
                  Trips Year to Date
                </div>
                <div style={{ marginTop: 3, fontSize: 11, color: "#64748b" }}>
                  January 1 – {referenceDate || summary.year}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: 0,
                  background: "transparent",
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "#334155",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}
            >
              {[
                ["Total trips", summary.totalTrips],
                ["Destinations", summary.destinations.length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 12,
                    background: "#f0fdfa",
                    border: "1px solid #ccfbf1",
                    padding: "9px 11px",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>{label}</div>
                  <div style={{ marginTop: 2, fontSize: 19, color: "#0f766e", fontWeight: 850 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {momFolderUrl ? (
              <a
                href={momFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open Group ${normalizedGroupKey} MOM folder in Google Drive`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 12,
                  padding: "9px 11px",
                  borderRadius: 12,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <FiFolder size={16} />
                  Group {normalizedGroupKey} MOM Folder
                </span>
                <FiExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}

            {summary.destinations.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>
                No trips recorded for {summary.year}.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: isMobile ? "calc(100vh - 230px)" : "calc(100vh - 330px)",
                  overflow: "auto",
                  borderRadius: 12,
                  boxShadow: "inset 0 0 0 1px #e2e8f0",
                }}
              >
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {summary.destinations.map((item, index) => (
                    <li
                      key={`${item.company_name}-${index}`}
                      style={{ padding: "11px 12px", borderBottom: "1px solid #e5e7eb" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                          {index + 1}. {item.company_name}
                        </div>
                        <span
                          style={{
                            flex: "0 0 auto",
                            borderRadius: 999,
                            padding: "2px 7px",
                            background: "#ecfeff",
                            color: "#0e7490",
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {item.visits} {item.visits === 1 ? "visit" : "visits"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 5,
                          color: "#64748b",
                          fontSize: 11,
                        }}
                      >
                        {item.lastDate ? <span>Last visit: {item.lastDate}</span> : null}
                        {item.owners.length ? <span>Owner: {item.owners.join(" / ")}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
