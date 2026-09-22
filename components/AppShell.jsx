import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiPackage,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import companyLogo from "../public/company-logo.png";

const mainLinks = [
  { href: "/", label: "Overview", icon: FiHome },
  { href: "/admin", label: "Management", icon: FiGrid, exact: true },
  { href: "/technical", label: "Technical", icon: FiActivity },
  { href: "/supply", label: "Supply", icon: FiPackage },
  { href: "/planning", label: "Planning", icon: FiCalendar },
];

const groupLinks = [
  { href: "/group/1", label: "Group A" },
  { href: "/group/2", label: "Group B" },
  { href: "/group/3", label: "Group C" },
];

const moreLinks = [
  { href: "/admin/weekly-history", label: "Weekly history", icon: FiClock },
  { href: "/admin/messages", label: "CEO messages", icon: FiMessageSquare },
];

function NavLink({ href, label, icon: Icon, currentPath, onClick, exact = false }) {
  const active = href === "/" || exact ? currentPath === href : currentPath.startsWith(href);
  return (
    <Link
      href={href}
      className={`app-nav-link${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {Icon && <Icon aria-hidden="true" />}
      <span>{label}</span>
    </Link>
  );
}

export default function AppShell({ children }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublic = router.pathname === "/login" || router.pathname.startsWith("/share/");
  const isTvMode = router.query.tv === "1";

  if (isPublic || isTvMode) return children;

  const closeMenu = () => setMenuOpen(false);
  const currentPath = router.asPath.split("?")[0];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link href="/" className="app-brand" aria-label="Artin Azma dashboard home">
            <span className="app-brand-mark">
              <Image src={companyLogo} alt="" priority />
            </span>
            <span className="app-brand-copy">
              <strong>Artin Azma</strong>
              <small>Management Center</small>
            </span>
          </Link>

          <button
            type="button"
            className="app-menu-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>

          <nav
            className={`app-navigation${menuOpen ? " is-open" : ""}`}
            aria-label="Main navigation"
          >
            <div className="app-nav-primary">
              {mainLinks.map((link) => (
                <NavLink key={link.href} {...link} currentPath={currentPath} onClick={closeMenu} />
              ))}

              <div className="app-nav-group">
                <button
                  type="button"
                  className="app-nav-link app-nav-trigger"
                  aria-haspopup="menu"
                  aria-label="Open group dashboards"
                >
                  <FiUsers aria-hidden="true" />
                  <span>Groups</span>
                  <FiChevronDown className="app-nav-chevron" aria-hidden="true" />
                </button>
                <div className="app-nav-popover">
                  <div className="app-nav-popover-title">Sales dashboards</div>
                  {groupLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      {...link}
                      icon={FiBarChart2}
                      currentPath={currentPath}
                      onClick={closeMenu}
                    />
                  ))}
                </div>
              </div>

              {moreLinks.map((link) => (
                <NavLink key={link.href} {...link} currentPath={currentPath} onClick={closeMenu} />
              ))}
            </div>

            <div className="app-nav-footer">
              <span className="app-secure-label">
                <FiShield aria-hidden="true" /> Secure session
              </span>
              <button type="button" className="app-logout-button" onClick={logout}>
                <FiLogOut aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="app-content" id="main-content" tabIndex="-1">
        {children}
      </div>
    </div>
  );
}
