import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  UsersRound,
  X
} from "lucide-react";
import heroBackground from "../images.jpg";
import "./styles.css";

const STORAGE = {
  clients: "sndtc_clients",
  requests: "sndtc_requests"
};

const routes = [
  { id: "home", label: "Home", path: "/" },
  { id: "request", label: "Request", path: "/request" },
  { id: "result", label: "Results", path: "/result" },
  { id: "contact", label: "Contact", path: "/contact" },
  { id: "admin", label: "Staff Workspace", path: "/admin" }
];

const serviceAreas = [
  {
    title: "Diagnostic Assessment",
    description: "Comprehensive assessments designed to identify learning, developmental, behavioural, communication, and other special needs concerns.",
    icon: Stethoscope
  },
  {
    title: "Therapy Services",
    description: "Structured intervention and support programmes tailored to individual needs and goals.",
    icon: Activity
  },
  {
    title: "Consultation Services",
    description: "Professional consultation for parents, caregivers, teachers, schools, organizations, and professionals seeking guidance.",
    icon: UsersRound
  },
  {
    title: "Educational Support",
    description: "Recommendations and support strategies that help learners achieve better educational outcomes.",
    icon: FileCheck2
  },
  {
    title: "Family and Caregiver Guidance",
    description: "Practical support, counselling, and recommendations that help families make informed decisions.",
    icon: ShieldCheck
  },
  {
    title: "Reports and Documentation",
    description: "Professional reports and recommendations that can support educational planning, referrals, interventions, and decision-making.",
    icon: FileText
  }
];

const servedGroups = [
  "Children",
  "Adolescents",
  "Adults",
  "Parents and Caregivers",
  "Schools and Educational Institutions",
  "Community Organizations",
  "Healthcare Professionals",
  "Government and Private Agencies"
];

const languageMessages = [
  {
    language: "English",
    greeting: "Welcome",
    title: "Support begins with understanding.",
    copy: "We provide assessment, therapy, consultation, and secure report access for individuals and families."
  },
  {
    language: "Yoruba",
    greeting: "E kaabo",
    title: "Iranlowo bere pelu oye.",
    copy: "A n pese ayewo, itoju, imoran, ati wiwole si abajade ni aabo fun olukuluku ati idile."
  },
  {
    language: "Hausa",
    greeting: "Barka da zuwa",
    title: "Taimako yana farawa da fahimta.",
    copy: "Muna bayar da tantancewa, kula, shawara, da samun rahoto cikin tsaro ga mutane da iyalai."
  },
  {
    language: "Igbo",
    greeting: "Nnoo",
    title: "Enyemaka na-amalite na nghota.",
    copy: "Anyị na-enye nyocha, ọgwụgwọ, ndụmọdụ, na ohere inweta akuko n'uzo echekwara maka ndi mmadu na ezinaulo."
  }
];

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeFileName(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "client";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function routeFromLocation() {
  if (location.hash) {
    const hashRoute = location.hash.replace("#", "") || "home";
    const hashMatch = routes.find((item) => item.id === hashRoute);
    if (hashMatch) {
      history.replaceState(null, "", hashMatch.path);
      return hashMatch.id;
    }
  }

  const path = location.pathname.replace(/\/+$/, "") || "/";
  return routes.find((item) => item.path === path)?.id || "home";
}

function pathForRoute(route) {
  return routes.find((item) => item.id === route)?.path || "/";
}

function App() {
  const [route, setRoute] = useState(routeFromLocation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clients, setClients] = useState(() => load(STORAGE.clients, []));
  const [requests, setRequests] = useState(() => load(STORAGE.requests, []));

  useEffect(() => {
    const onPop = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => save(STORAGE.clients, clients), [clients]);
  useEffect(() => save(STORAGE.requests, requests), [requests]);

  function navigate(nextRoute) {
    setMenuOpen(false);
    const nextPath = pathForRoute(nextRoute);
    if (location.pathname !== nextPath) {
      history.pushState(null, "", nextPath);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {route !== "admin" && (
        <Header route={route} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} />
      )}
      <main>
        {route === "home" && <Home navigate={navigate} />}
        {route === "request" && <RequestPage setRequests={setRequests} navigate={navigate} />}
        {route === "result" && <ResultPage clients={clients} navigate={navigate} />}
        {route === "contact" && <ContactPage navigate={navigate} />}
        {route === "admin" && (
          <AdminPage clients={clients} setClients={setClients} requests={requests} setRequests={setRequests} navigate={navigate} />
        )}
      </main>
      {route !== "admin" && <Footer navigate={navigate} />}
    </>
  );
}

function Header({ route, menuOpen, setMenuOpen, navigate }) {
  const publicRoutes = routes.filter((item) => item.id !== "admin");

  return (
    <header className="site-header">
      <div className="header-strip">
        <span>Federal College of Education (Special), Oyo</span>
        <span>Special Needs Diagnosis and Therapy Center</span>
      </div>
      <div className="header-main">
        <button className="brand" type="button" onClick={() => navigate("home")} aria-label="Go to home">
          <span>
            <strong>Special Needs Diagnosis and Therapy Center</strong>
            <small>Assessment, therapy, consultation, reports</small>
          </span>
        </button>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Open menu">
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <nav className={`site-nav ${menuOpen ? "open" : ""}`} aria-label="Main navigation">
          {publicRoutes.map((item) => (
            <button
              className={route === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="login-link" type="button" onClick={() => navigate("admin")}>
            Login
          </button>
        </nav>
      </div>
    </header>
  );
}

function Home({ navigate }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const activeMessage = languageMessages[messageIndex];

  return (
    <div className="home-page redesigned-home">
      <section className="hero-redesign" style={{ "--hero-bg": `url(${heroBackground})` }}>
        <div className="hero-redesign-copy" key={activeMessage.language}>
          <h1>Special Needs Diagnosis and Therapy Center</h1>
          <p className="hero-lede">
            A calm, professional center for assessment, therapy, consultation, family guidance, and secure report access.
          </p>

          <div className="language-card">
            <div>
              <span>{activeMessage.language}</span>
              <strong>{activeMessage.greeting}</strong>
            </div>
            <p>{activeMessage.copy}</p>
          </div>

          <div className="hero-actions">
            <button className="button primary" type="button" onClick={() => navigate("request")}>
              Submit Request <ArrowRight size={18} />
            </button>
            <button className="button ghost warm" type="button" onClick={() => navigate("result")}>
              Access Results
            </button>
          </div>

          <div className="language-dots refined" aria-label="Choose language">
            {languageMessages.map((item, index) => (
              <button
                className={index === messageIndex ? "active" : ""}
                key={item.language}
                type="button"
                onClick={() => setMessageIndex(index)}
              >
                {item.language}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-quick-panel" aria-label="Center highlights">
          <article>
            <FileCheck2 size={22} />
            <strong>Secure reports</strong>
            <span>Private online access for released results.</span>
          </article>
          <article>
            <UsersRound size={22} />
            <strong>Family guidance</strong>
            <span>Clear next steps for parents and caregivers.</span>
          </article>
        </div>

        <div className="trust-strip hero-trust-strip">
          <article>
            <strong>Assessment</strong>
            <span>Learning, speech, developmental, and behavioural needs</span>
          </article>
          <article>
            <strong>Therapy</strong>
            <span>Structured intervention and support programmes</span>
          </article>
          <article>
            <strong>Consultation</strong>
            <span>Guidance for families, schools, and organizations</span>
          </article>
        </div>
      </section>

      <section className="design-section services-redesign">
        <div className="design-heading">
          <p>What we do</p>
          <h2>Services built around clarity, care, and practical decisions.</h2>
        </div>
        <div className="services-redesign-grid">
          {serviceAreas.map(({ title, description, icon: Icon }) => (
            <article key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="design-section split-redesign">
        <div>
          <p className="eyebrow">Who we support</p>
          <h2>For individuals, families, schools, and professional bodies.</h2>
          <p>
            The center helps people understand needs, document findings, and determine appropriate support pathways.
          </p>
        </div>
        <div className="audience-list">
          {servedGroups.map((group) => (
            <span key={group}>{group}</span>
          ))}
        </div>
      </section>

      <section className="report-band">
        <div>
          <p className="eyebrow">Result access</p>
          <h2>Completed reports can be accessed securely online.</h2>
          <p>
            Clients with assigned credentials can check report availability and download released PDF documents.
          </p>
        </div>
        <button className="button light" type="button" onClick={() => navigate("result")}>
          Access Results
        </button>
      </section>
    </div>
  );

}

function RequestPage({ setRequests, navigate }) {
  const [message, setMessage] = useState("");

  function submitRequest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setRequests((items) => [
      {
        id: makeId("request"),
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        service: data.service,
        urgency: data.urgency,
        clientType: data.clientType,
        note: data.note.trim(),
        status: "New",
        createdAt: new Date().toISOString()
      },
      ...items
    ]);
    form.reset();
    setMessage("Request submitted. Staff can now review this request in the workspace.");
  }

  return (
    <section className="app-page request-page">
      <div className="page-lead">
        <p className="eyebrow">Service Request</p>
        <h1>Submit a Request</h1>
      </div>
      <div className="intake-layout">
        <form className="surface intake-card form-grid" onSubmit={submitRequest}>
          <label>
            Full name
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            Phone number
            <input name="phone" type="tel" autoComplete="tel" required />
          </label>
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Client type
            <select name="clientType" required defaultValue="">
              <option value="" disabled>Select one</option>
              <option>Child / learner</option>
              <option>Adult client</option>
              <option>School referral</option>
              <option>Caregiver enquiry</option>
            </select>
          </label>
          <label>
            Support needed
            <select name="service" required defaultValue="">
              <option value="" disabled>Select one</option>
              <option>Diagnosis / Assessment</option>
              <option>Therapy Consultation</option>
              <option>Follow-up Session</option>
              <option>School or Caregiver Guidance</option>
            </select>
          </label>
          <label>
            Priority
            <select name="urgency" required defaultValue="Routine">
              <option>Routine</option>
              <option>Soon</option>
              <option>Urgent</option>
            </select>
          </label>
          <label className="wide">
            First concern or context
            <textarea name="note" rows="6" placeholder="Age range, concern, referral reason, preferred contact time, or relevant background." />
          </label>
          <div className="form-footer wide">
            <button className="button primary" type="submit">
              Submit Request <ArrowRight size={18} />
            </button>
            <button className="button ghost" type="button" onClick={() => navigate("contact")}>
              Contact Help Desk
            </button>
          </div>
          <p className="form-message wide" role="status">{message}</p>
        </form>
      </div>
    </section>
  );
}

function ResultPage({ clients, navigate }) {
  const [result, setResult] = useState(null);

  function checkResult(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const phone = normalize(data.phone);
    const client = clients.find((record) => {
      return normalize(record.phone) === phone && record.password === String(data.password || "");
    });
    setResult(client || false);
  }

  return (
    <section className="app-page result-page">
      <div className="page-lead compact">
        <p className="eyebrow">Secure result access</p>
        {/* <h1>Private report lookup after assessment or therapy review.</h1> */}
        {/* <p>Clients use their registered detail and staff-issued password to check readiness and download PDF reports.</p> */}
      </div>
      <div className="result-layout">
        <form className="surface lookup-card stacked-form" onSubmit={checkResult}>
          <label>
            Phone number
            <input name="phone" type="tel" autoComplete="tel" required />
          </label>
          <label>
            Result password
            <input name="password" type="password" required />
          </label>
          <button className="button primary" type="submit">
            Check Result <Search size={18} />
          </button>
        </form>
        <ResultCard result={result} navigate={navigate} />
      </div>
    </section>
  );
}

function ResultCard({ result, navigate }) {
  if (result === null) {
    return (
      <aside className="result-card idle">
        <LockKeyhole size={30} />
        <h2>Private lookup</h2>
        <p>Report readiness and download actions appear here after the details are verified.</p>
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="result-card">
        <X size={30} />
        <h2>No matching record</h2>
        <p>The details do not match a client record. Submit a request or contact the center for support.</p>
        <button className="button ghost" type="button" onClick={() => navigate("request")}>
          Submit Request
        </button>
      </aside>
    );
  }

  if (result.status !== "ready" || !result.pdfData) {
    return (
      <aside className="result-card">
        <Activity size={30} />
        <h2>Report in progress</h2>
        <p>{result.name}, your record exists, but the PDF report is not ready yet.</p>
      </aside>
    );
  }

  return (
    <aside className="result-card ready">
      <CheckCircle2 size={30} />
      <h2>Report ready</h2>
      <p>{result.name}, your PDF report is available for viewing or download.</p>
      <div className="result-actions">
        <a className="button primary" href={result.pdfData} target="_blank" rel="noreferrer">
          View PDF
        </a>
        <a className="button ghost" href={result.pdfData} download={`${safeFileName(result.name)}-result.pdf`}>
          Download
        </a>
      </div>
    </aside>
  );
}

function ContactPage({ navigate }) {
  return (
    <section className="app-page contact-page">
      <div className="page-lead">
        <p className="eyebrow">Contact the center</p>
        <h1>For appointments, referrals, result support, and care coordination.</h1>
        <p>Clients, caregivers, and schools can reach the center after submitting a request or when they need report access help.</p>
      </div>
      <div className="contact-grid">
        <article className="surface contact-card">
          <Phone size={24} />
          <span>Phone</span>
          <strong>+234 800 000 0000</strong>
          <a href="tel:+2348000000000">Call the center</a>
        </article>
        <article className="surface contact-card">
          <Mail size={24} />
          <span>Email</span>
          <strong>support@fcespecialoyo.edu.ng</strong>
          <a href="mailto:support@fcespecialoyo.edu.ng">Send email</a>
        </article>
        <article className="surface contact-card">
          <MapPin size={24} />
          <span>Location</span>
          <strong>Federal College of Education (Special), Oyo</strong>
          <p>Special Needs Diagnosis and Therapy Center, Oyo State, Nigeria.</p>
        </article>
      </div>
      <section className="contact-action">
        <div>
          <p className="eyebrow">Best first step</p>
          <h2>Submit a request so staff can respond with useful context.</h2>
        </div>
        <button className="button primary" type="button" onClick={() => navigate("request")}>
          Submit Request
        </button>
      </section>
    </section>
  );
}

function AdminPage({ clients, setClients, requests, setRequests, navigate }) {
  const [view, setView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 981px)").matches);
  const [clientSearch, setClientSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [clientMessage, setClientMessage] = useState("");

  const stats = useMemo(() => {
    const ready = clients.filter((client) => client.status === "ready").length;
    const open = requests.filter((request) => request.status !== "Completed").length;
    const scheduled = requests.filter((request) => request.status === "Scheduled").length;
    const pdf = clients.length ? Math.round((clients.filter((client) => client.pdfData).length / clients.length) * 100) : 0;
    return { ready, open, scheduled, pdf };
  }, [clients, requests]);

  const filteredClients = clients.filter((client) =>
    [client.name, client.email, client.phone, client.status].some((value) => normalize(value).includes(normalize(clientSearch)))
  );

  const filteredRequests = requests.filter((request) =>
    [request.name, request.email, request.phone, request.service, request.status, request.urgency, request.clientType].some((value) =>
      normalize(value).includes(normalize(requestSearch))
    )
  );

  async function saveClient(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const file = form.pdf.files[0];
    const existing = clients.find((client) => client.id === data.id);
    const record = {
      id: data.id || makeId("client"),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      password: data.password.trim(),
      status: data.status,
      pdfData: file ? await fileToDataUrl(file) : existing?.pdfData || "",
      pdfName: file?.name || existing?.pdfName || "",
      updatedAt: new Date().toISOString()
    };
    setClients((items) => (data.id ? items.map((item) => (item.id === data.id ? record : item)) : [record, ...items]));
    setEditing(null);
    setClientMessage("Client result record saved.");
    form.reset();
  }

  function updateRequest(id, status) {
    setRequests((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  function openAdminView(nextView) {
    setView(nextView);
    setSidebarOpen(false);
  }

  return (
    <section className={`ops-page ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {sidebarOpen && (
        <button className="sidebar-backdrop" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`ops-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Admin navigation">
        <div className="sidebar-head">
          <button className="admin-brand" type="button" onClick={() => navigate("home")}>
            <strong>Admin Workspace</strong>
          </button>
          <button className="sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>
        <nav>
          {[
            ["overview", "Overview", BarChart3],
            ["requests", "Request Queue", CalendarCheck],
            ["clients", "Client Records", UsersRound],
            ["reports", "Report Setup", FileCheck2]
          ].map(([id, label, Icon]) => (
            <button className={view === id ? "active" : ""} key={id} type="button" onClick={() => openAdminView(id)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <button className="button ghost" type="button" onClick={() => navigate("home")}>
          Public Site
        </button>
      </aside>

      <div className="ops-main">
        <header className="ops-header-shell">
          <div className="ops-strip">
            <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="ops-title-block">
              <strong>Admin Workspace</strong>
              <span>Manage requests, clients, reports, and center activity</span>
            </div>
            <div className="ops-header-actions">
              <button type="button" onClick={() => setView("requests")}>Requests</button>
              <button type="button" onClick={() => setView("clients")}>Clients</button>
              <button type="button" onClick={() => setView("reports")}>Upload Report</button>
            </div>
            <time>{new Date().toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" })}</time>
          </div>
         
        </header>

        <section className="metric-grid">
          <Metric icon={UsersRound} label="Client records" value={clients.length} />
          <Metric icon={FileCheck2} label="Ready reports" value={stats.ready} />
          <Metric icon={CalendarCheck} label="Open requests" value={stats.open} />
          <Metric icon={BarChart3} label="PDF coverage" value={`${stats.pdf}%`} />
        </section>

        {view === "overview" && (
          <div className="ops-overview">
            <section className="surface priority-panel">
              <div className="list-header">
                <div>
                  <p className="eyebrow">Priority</p>
                  <h2>Today's operational focus</h2>
                </div>
              </div>
              <div className="focus-grid">
                <article>
                  <Sparkles size={22} />
                  <strong>{stats.open} requests need review</strong>
                  <span>Move new requests to contacted or scheduled.</span>
                </article>
                <article>
                  <Upload size={22} />
                  <strong>{clients.length - clients.filter((client) => client.pdfData).length} reports missing PDFs</strong>
                  <span>Attach PDFs before marking reports ready.</span>
                </article>
                <article>
                  <CalendarCheck size={22} />
                  <strong>{stats.scheduled} sessions scheduled</strong>
                  <span>Prepare client records after completed sessions.</span>
                </article>
              </div>
            </section>
            <RequestBoard requests={filteredRequests.slice(0, 6)} updateRequest={updateRequest} setRequests={setRequests} compact />
          </div>
        )}

        {view === "requests" && (
          <section className="surface board-panel">
            <BoardHeader title="Request queue" eyebrow="Requests" value={requestSearch} onChange={setRequestSearch} placeholder="Search requests" />
            <RequestBoard requests={filteredRequests} updateRequest={updateRequest} setRequests={setRequests} />
          </section>
        )}

        {view === "clients" && (
          <section className="surface table-panel">
            <BoardHeader title="Client records" eyebrow="Records" value={clientSearch} onChange={setClientSearch} placeholder="Search clients" />
            <ClientTable clients={filteredClients} setClients={setClients} setEditing={(client) => {
              setEditing(client);
              setView("reports");
            }} />
          </section>
        )}

        {view === "reports" && (
          <section className="admin-workspace">
            <RecordForm editing={editing} setEditing={setEditing} saveClient={saveClient} clientMessage={clientMessage} setClientMessage={setClientMessage} />
            <section className="surface table-panel">
              <BoardHeader title="Recent report records" eyebrow="Reports" value={clientSearch} onChange={setClientSearch} placeholder="Search records" />
              <ClientTable clients={filteredClients} setClients={setClients} setEditing={setEditing} />
            </section>
          </section>
        )}
      </div>
    </section>
  );
}

function BoardHeader({ title, eyebrow, value, onChange, placeholder }) {
  return (
    <div className="list-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <label className="search-field">
        <Search size={16} />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </label>
    </div>
  );
}

function RequestBoard({ requests, updateRequest, setRequests, compact = false }) {
  const columns = ["New", "Contacted", "Scheduled", "Completed"];
  return (
    <div className={`kanban ${compact ? "compact" : ""}`}>
      {columns.map((column) => (
        <section className="kanban-column" key={column}>
          <div className="kanban-title">
            <strong>{column}</strong>
            <span>{requests.filter((request) => request.status === column).length}</span>
          </div>
          <div className="kanban-stack">
            {requests.filter((request) => request.status === column).map((request) => (
              <article className="request-card" key={request.id}>
                <div className="request-card-top">
                  <span className="status">{request.urgency || "Routine"}</span>
                  <span>{formatDate(request.createdAt)}</span>
                </div>
                <h3>{request.name}</h3>
                <p>{request.service}</p>
                <p>{request.email} / {request.phone}</p>
                {request.note && <blockquote>{request.note}</blockquote>}
                <div className="request-actions">
                  <select value={request.status} onChange={(event) => updateRequest(request.id, event.target.value)}>
                    {columns.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <button className="mini-button danger" type="button" onClick={() => setRequests((items) => items.filter((item) => item.id !== request.id))}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
            {!requests.filter((request) => request.status === column).length && <p className="empty-note">No {column.toLowerCase()} requests.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecordForm({ editing, setEditing, saveClient, clientMessage, setClientMessage }) {
  return (
    <form className="surface record-form" onSubmit={saveClient}>
      <input type="hidden" name="id" value={editing?.id || ""} readOnly />
      <div className="section-heading tight">
        <p className="eyebrow">{editing ? "Edit report" : "Create report"}</p>
        <h2>Client result setup</h2>
      </div>
      <div className="form-grid">
        <label>
          Client name
          <input name="name" type="text" required defaultValue={editing?.name || ""} key={`name-${editing?.id || "new"}`} />
        </label>
        <label>
          Email
          <input name="email" type="email" required defaultValue={editing?.email || ""} key={`email-${editing?.id || "new"}`} />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" required defaultValue={editing?.phone || ""} key={`phone-${editing?.id || "new"}`} />
        </label>
        <label>
          Result password
          <input name="password" type="text" required defaultValue={editing?.password || ""} key={`password-${editing?.id || "new"}`} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={editing?.status || "not-ready"} key={`status-${editing?.id || "new"}`}>
            <option value="not-ready">Not ready</option>
            <option value="ready">Ready</option>
          </select>
        </label>
        <label>
          PDF result
          <input name="pdf" type="file" accept="application/pdf" />
        </label>
      </div>
      <div className="form-footer">
        <button className="button primary" type="submit">
          <Upload size={18} /> Save Record
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() => {
            setEditing(null);
            setClientMessage("");
          }}
        >
          Clear
        </button>
      </div>
      <p className="form-message">{clientMessage}</p>
    </form>
  );
}

function ClientTable({ clients, setClients, setEditing }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Contact</th>
            <th>Status</th>
            <th>PDF</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.length ? (
            clients.map((client) => (
              <tr key={client.id}>
                <td><strong>{client.name}</strong></td>
                <td>{client.email}<br />{client.phone}</td>
                <td>
                  <span className={`status ${client.status === "ready" ? "ready" : ""}`}>
                    {client.status === "ready" ? "Ready" : "Not ready"}
                  </span>
                </td>
                <td>
                  {client.pdfData ? (
                    <a href={client.pdfData} target="_blank" rel="noreferrer">{client.pdfName || "PDF"}</a>
                  ) : (
                    "No file"
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <button className="mini-button" type="button" onClick={() => setEditing(client)}>Edit</button>
                    <button className="mini-button danger" type="button" onClick={() => setClients((items) => items.filter((item) => item.id !== client.id))}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No client records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article className="metric-card">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div>
            <strong>Special Needs Diagnosis and Therapy Center</strong>
            <small>Federal College of Education (Special), Oyo</small>
          </div>
          <p>Providing assessment, diagnosis, therapy, consultation, and professional support services for individuals, families, schools, and communities.</p>
        </div>
        <div className="footer-contact">
          <span>Services</span>
          <p>Diagnostic Assessment</p>
          <p>Therapy Services</p>
          <p>Consultation Services</p>
        </div>
        <div className="footer-links">
          <span>Quick Links</span>
          <button type="button" onClick={() => navigate("request")}>Submit Request</button>
          <button type="button" onClick={() => navigate("result")}>Access Results</button>
          <button type="button" onClick={() => navigate("contact")}>Contact</button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Copyright (c) 2026 Special Needs Diagnosis and Therapy Center</span>
        <button type="button" onClick={() => navigate("request")}>Submit Request</button>
      </div>
    </footer>
  );
}

createRoot(document.getElementById("root")).render(<App />);
