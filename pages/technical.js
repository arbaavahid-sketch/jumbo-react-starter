// pages/technical.js — داشبورد Technical

import Head from "next/head";
import useSWR from "swr";
import LiveClock from "../components/LiveClock";
import CeoMessage from "../components/CeoMessage";

// آیکون‌ها
import {
  FiCalendar,
  FiPlusCircle,
  FiCheckCircle,
  FiList,
  FiTruck,
  FiBriefcase,
  FiCamera,
  FiBookOpen,
} from "react-icons/fi";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export default function TechnicalDashboard() {
  const { data, error, isLoading } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const { data: mainData } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
  });

  const ceoMessages = mainData?.ceo_messages || {};
  const ceoText =
    ceoMessages.TECH ||
    ceoMessages.Technical ||
    "Technical CEO message — editable in CEO Messages panel.";

  let body;
  if (error) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 20,
          background: "#fee2e2",
          color: "#991b1b",
        }}
      >
        Error loading technical data.
      </div>
    );
  } else if (isLoading || !data) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 20,
          background: "#f3f4f6",
        }}
      >
        Loading technical data…
      </div>
    );
  } else if (!data.latest) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 20,
          background: "linear-gradient(135deg,#f9fafb,#e5f0ff)",
          boxShadow: "0 0 0 1px rgba(148,163,184,0.3)",
        }}
      >
        No technical data yet.
      </div>
    );
  } else {
    const t = data.latest;

    body = (
      <div
        style={{
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#f9fafb,#e0f2fe)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.35)",
        }}
      >
        {/* کارت‌ها */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
          }}
        >
          <TechCard icon={<FiCalendar />} label="Date of Publish" value={t.date} />
          <TechCard
            icon={<FiPlusCircle />}
            label="Deals added this week"
            value={t.deals_added_technical}
          />
          <TechCard
            icon={<FiCheckCircle />}
            label="Total deals done"
            value={t.total_deals_week}
          />
          <TechCard
            icon={<FiList />}
            label="Remaining queue"
            value={t.remaining_queue}
          />
          <TechCard
            icon={<FiTruck />}
            label="Waiting installation"
            value={t.waiting_installation}
          />
          <TechCard
            icon={<FiBriefcase />}
            label="Promotion trips / meetings"
            value={t.promotion_trips}
          />
          <TechCard
            icon={<FiCamera />}
            label="Demo shows (quarterly)"
            value={t.demo_shows}
          />
          <TechCard
            icon={<FiBookOpen />}
            label="Internal trainings (quarterly)"
            value={t.internal_trainings}
          />
        </div>

        {/* تیم فنی */}
        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 12,
          }}
        >
          <TechSmall label="Aref" value={t.aref} />
          <TechSmall label="Golsanam" value={t.golsanam} />
          <TechSmall label="Vahid" value={t.vahid} />
          <TechSmall label="Pouria" value={t.pouria} />
        </div>

        {/* لینک‌ها */}
        <div style={{ marginTop: 24, fontSize: 13 }}>
          <b>Waiting installation IDs:</b> {t.waiting_installation_ids || "-"}
          <br />
          <b>MOM link: </b>
          <a href={t.mom_link} target="_blank" style={{ color: "#2563eb" }}>
            Open
          </a>
        </div>
      </div>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <Head>
        <title>Technical Dashboard</title>
      </Head>

      {/* هدر بدون آیکون */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Technical Dashboard</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <img
            src="/company-logo.svg"
            style={{ width: 160, height: 90, objectFit: "contain" }}
          />
          <div
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 999,
              background: "rgba(148,163,184,0.15)",
            }}
          >
            <LiveClock />
          </div>
        </div>
      </div>

      <CeoMessage text={ceoText} />

      {body}
    </main>
  );
}

/* --- کارت‌ها با آیکون --- */

function TechCard({ icon, label, value }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: "#ffffff",
        boxShadow:
          "0 12px 30px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20, color: "#0ea5e9" }}>{icon}</span>
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>
        {value ?? 0}
      </div>
    </div>
  );
}

function TechSmall({ label, value }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: "#ffffff",
        boxShadow:
          "0 8px 20px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.15)",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value ?? 0}</div>
    </div>
  );
}
