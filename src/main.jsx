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
import { createClient } from "@supabase/supabase-js";
import heroBackground from "../images.png";
import "./styles.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = supabaseEnabled ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const REPORT_BUCKET = "reports";
const REPORT_TTL_DAYS = 30;

const STORAGE = {
  clients: "sndtc_clients",
  requests: "sndtc_requests",
  clientLogs: "sndtc_client_logs"
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

function userErrorMessage(error, fallback) {
  const message = error?.message || "";
  const contextMessage = error?.context?.error || error?.context?.message || "";
  if (contextMessage) {
    return contextMessage;
  }
  if (message.toLowerCase().includes("edge function")) {
    return "Result download service is not active yet. Please contact the center so staff can enable report access.";
  }
  return message || fallback;
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST204" ||
    (message.includes(tableName) && (message.includes("schema cache") || message.includes("could not find")))
  );
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

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function storageFileName(fileName) {
  const parts = String(fileName || "report.pdf").split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "pdf";
  const base = safeFileName(parts.join(".") || "report");
  return `${base}.${ext === "pdf" ? "pdf" : ext}`;
}

function toRequest(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    urgency: row.urgency,
    clientType: row.client_type,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.result_password,
    status: row.status,
    reportPath: row.report_path,
    pdfName: row.report_name,
    reportUploadedAt: row.report_uploaded_at,
    reportExpiresAt: row.report_expires_at,
    updatedAt: row.updated_at
  };
}

function toClientLog(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    action: row.action,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    createdAt: row.created_at,
    oldData: row.old_data,
    newData: row.new_data
  };
}

async function submitServiceRequest(data) {
  const request = {
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
  };

  const record = {
    name: request.name,
    email: request.email,
    phone: request.phone,
    service: request.service,
    urgency: request.urgency,
    client_type: request.clientType,
    note: request.note,
    status: "New"
  };

  if (!supabaseEnabled) {
    return request;
  }

  const { error } = await supabase.from("service_requests").insert(record);

  if (error) throw error;
  return request;
}

async function fetchAdminData() {
  if (!supabaseEnabled) {
    return {
      clients: load(STORAGE.clients, []),
      requests: load(STORAGE.requests, []),
      clientLogs: load(STORAGE.clientLogs, [])
    };
  }

  const [
    { data: clients, error: clientsError },
    { data: requests, error: requestsError },
    { data: clientLogs, error: logsError }
  ] = await Promise.all([
    supabase.from("clients").select("*").order("updated_at", { ascending: false }),
    supabase.from("service_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("client_logs").select("*").order("created_at", { ascending: false }).limit(100)
  ]);

  if (clientsError) throw clientsError;
  if (requestsError) throw requestsError;
  if (logsError && !isMissingTableError(logsError, "client_logs")) throw logsError;

  return {
    clients: (clients || []).map(toClient),
    requests: (requests || []).map(toRequest),
    clientLogs: logsError ? [] : (clientLogs || []).map(toClientLog)
  };
}

async function saveClientRecord(data, file, existing) {
  if (!supabaseEnabled) {
    return {
      id: data.id || makeId("client"),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      password: data.password.trim(),
      status: data.status,
      reportPath: existing?.reportPath || "",
      pdfName: file?.name || existing?.pdfName || "",
      reportUploadedAt: file ? new Date().toISOString() : existing?.reportUploadedAt || "",
      reportExpiresAt: file ? daysFromNow(REPORT_TTL_DAYS) : existing?.reportExpiresAt || "",
      updatedAt: new Date().toISOString()
    };
  }

  const id = data.id || crypto.randomUUID();
  let reportPath = existing?.reportPath || null;
  let reportName = existing?.pdfName || null;
  let reportUploadedAt = existing?.reportUploadedAt || null;
  let reportExpiresAt = existing?.reportExpiresAt || null;

  if (file) {
    if (existing?.reportPath) {
      await supabase.storage.from(REPORT_BUCKET).remove([existing.reportPath]);
    }

    reportPath = `${id}/${Date.now()}-${storageFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(REPORT_BUCKET)
      .upload(reportPath, file, { contentType: "application/pdf", upsert: false });

    if (uploadError) throw uploadError;

    reportName = file.name;
    reportUploadedAt = new Date().toISOString();
    reportExpiresAt = daysFromNow(REPORT_TTL_DAYS);
  }

  const payload = {
    id,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    result_password: data.password.trim(),
    status: data.status,
    report_path: reportPath,
    report_name: reportName,
    report_uploaded_at: reportUploadedAt,
    report_expires_at: reportExpiresAt
  };

  const { data: saved, error } = await supabase
    .from("clients")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return toClient(saved);
}

async function updateRequestStatus(id, status) {
  if (!supabaseEnabled) return;
  const { error } = await supabase.from("service_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteRequestRecord(id) {
  if (!supabaseEnabled) return;
  const { error } = await supabase.from("service_requests").delete().eq("id", id);
  if (error) throw error;
}

async function deleteClientRecord(client) {
  if (!supabaseEnabled) return;
  if (client.reportPath) {
    await supabase.storage.from(REPORT_BUCKET).remove([client.reportPath]);
  }
  const { error } = await supabase.from("clients").delete().eq("id", client.id);
  if (error) throw error;
}

async function getReportUrl(client) {
  if (!client?.reportPath || !supabaseEnabled) return "";
  const { data, error } = await supabase.storage.from(REPORT_BUCKET).createSignedUrl(client.reportPath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

async function verifyResult(phone, password, localClients) {
  if (!supabaseEnabled) {
    const client = localClients.find((record) => normalize(record.phone) === normalize(phone) && record.password === String(password || ""));
    return client ? { ...client, signedUrl: "" } : null;
  }

  const { data, error } = await supabase.functions.invoke("verify-result-access", {
    body: { phone, password }
  });

  if (error) throw error;
  return data?.record || null;
}

async function downloadFile(url, fileName) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not download the PDF file.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function sendRequestEmail({ to, subject, message }) {
  if (!supabaseEnabled) {
    openMailClient(to, subject, message);
    return;
  }

  const { data, error } = await supabase.functions.invoke("send-request-email", {
    body: { to, subject, message }
  });

  if (error) {
    throw new Error(error.context?.error || error.context?.message || error.message || "Could not send email.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}

function openMailClient(email, subject, body) {
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function gmailComposeUrl(email, subject, body) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function routeFromLocation() {
  if (location.hash) {
    const hashRoute = location.hash.replace("#", "") || "home";
    const hashMatch = routes.find((item) => item.id === hashRoute);
    if (hashMatch) {
      return hashMatch.id;
    }
  }

  const path = location.pathname.replace(/\/+$/, "") || "/";
  return routes.find((item) => item.path === path)?.id || "home";
}

function pathForRoute(route) {
  const match = routes.find((item) => item.id === route);
  return match?.id === "home" ? "/" : `/#${match?.id || "home"}`;
}

function App() {
  const [route, setRoute] = useState(routeFromLocation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clients, setClients] = useState(() => (supabaseEnabled ? [] : load(STORAGE.clients, [])));
  const [requests, setRequests] = useState(() => (supabaseEnabled ? [] : load(STORAGE.requests, [])));
  const [clientLogs, setClientLogs] = useState(() => (supabaseEnabled ? [] : load(STORAGE.clientLogs, [])));
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseEnabled);

  useEffect(() => {
    const onPop = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!supabaseEnabled) {
      save(STORAGE.clients, clients);
    }
  }, [clients]);

  useEffect(() => {
    if (!supabaseEnabled) {
      save(STORAGE.requests, requests);
    }
  }, [requests]);

  useEffect(() => {
    if (!supabaseEnabled) {
      save(STORAGE.clientLogs, clientLogs);
    }
  }, [clientLogs]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let active = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function navigate(nextRoute) {
    setMenuOpen(false);
    const nextPath = pathForRoute(nextRoute);
    const currentPath = `${location.pathname}${location.hash}`;
    if (currentPath !== nextPath) {
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
          <AdminPage
            clients={clients}
            setClients={setClients}
            requests={requests}
            setRequests={setRequests}
            clientLogs={clientLogs}
            setClientLogs={setClientLogs}
            navigate={navigate}
            session={session}
            authReady={authReady}
            setSession={setSession}
          />
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
    <div className="home-page redesigned-home" style={{ "--hero-bg": `url(${heroBackground})` }}>
      <section className="hero-redesign">
        <div className="hero-redesign-copy" key={activeMessage.language}>
          <h1>Special Needs Diagnosis and Therapy Center</h1>
          <p className="hero-lede">
             {/* Center for assessment, therapy, consultation, family guidance, and secure report access. */}
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
            <span>Guidance for individuals, families, schools, and organizations</span>
          </article>
        </div>
      </section>

      <section className="design-section services-redesign">
        <div className="design-heading">
          <p>We Offer</p>
          <h2>Assessment, therapy, consultation, and documentation support.</h2>
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
          <p className="eyebrow">To</p>
          <h2>Individuals, families, schools, and professional bodies.</h2>
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
  const [submitting, setSubmitting] = useState(false);

  async function submitRequest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setSubmitting(true);
    setMessage("");
    try {
      const request = await submitServiceRequest(data);
      setRequests((items) => [request, ...items]);
      form.reset();
      setMessage("Request submitted. Staff can now review this request in the workspace.");
    } catch (error) {
      setMessage(error.message || "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <button className="button primary" type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Submitting..." : "Submit Request"} <ArrowRight size={18} />
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
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function checkResult(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setChecking(true);
    setMessage("");
    try {
      const record = await verifyResult(data.phone, data.password, clients);
      setResult(record || false);
    } catch (error) {
      setResult(false);
      setMessage(userErrorMessage(error, "Could not check the result right now."));
    } finally {
      setChecking(false);
    }
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
          <button className="button primary" type="submit" disabled={checking} aria-busy={checking}>
            {checking ? "Checking..." : "Check Result"} <Search size={18} />
          </button>
          <p className="form-message" role="status">{message}</p>
        </form>
        <ResultCard result={result} navigate={navigate} />
      </div>
    </section>
  );
}

function ResultCard({ result, navigate }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");

  async function handleDownload() {
    const url = result?.signedUrl || result?.pdfData;
    if (!url || downloading) return;

    setDownloading(true);
    setDownloadMessage("");
    try {
      await downloadFile(url, result.reportName || `${safeFileName(result.name)}-result.pdf`);
    } catch (error) {
      setDownloadMessage(error.message || "Could not download the PDF.");
    } finally {
      setDownloading(false);
    }
  }

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

  if (result.accessLimited || result.status === "limited") {
    return (
      <aside className="result-card">
        <Mail size={30} />
        <h2>Result access limit reached</h2>
        <p>
          Result access has exceeded the limit. Please contact the center administrator to continue.
        </p>
        {result.emailSent === false && (
          <p>The email could not be sent automatically. Please contact the center for support.</p>
        )}
      </aside>
    );
  }

  if (result.status !== "ready" || (!result.signedUrl && !result.pdfData)) {
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
      {result.reportExpiresAt && <p>This file reference expires on {formatDate(result.reportExpiresAt)}.</p>}
      <div className="result-actions">
        <a className="button primary" href={result.signedUrl || result.pdfData} target="_blank" rel="noreferrer">
          View PDF
        </a>
        <button className="button ghost" type="button" onClick={handleDownload} disabled={downloading} aria-busy={downloading}>
          {downloading ? "Downloading..." : "Download PDF"}
        </button>
      </div>
      <p className="form-message" role="status">{downloadMessage}</p>
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

function AdminLogin({ navigate, setSession }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSubmitting(true);
    setMessage("");

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password
      });

      if (error) throw error;
      if (authData.session) {
        setSession(authData.session);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
    } catch (error) {
      setMessage(error.message || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="app-page admin-login-page">
      <div className="page-lead compact">
        <p className="eyebrow">Staff access</p>
        <h1>Sign in to manage the portal.</h1>
        <p>Authorized staff can manage requests, client records, report references, and private report files.</p>
      </div>
      <form className="surface lookup-card stacked-form" onSubmit={signIn}>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button primary" type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Signing in..." : "Sign In"} <LockKeyhole size={18} />
        </button>
        <button className="button ghost" type="button" onClick={() => navigate("home")} disabled={submitting}>
          Public Site
        </button>
        <p className="form-message" role="status">{message}</p>
      </form>
    </section>
  );
}

function AdminLoading({ navigate }) {
  return (
    <section className="app-page admin-login-page">
      <div className="surface lookup-card admin-loading-card">
        <LockKeyhole size={26} />
        <h1>Loading workspace</h1>
        <p>Checking your staff session and preparing admin records.</p>
        <button className="button ghost" type="button" onClick={() => navigate("home")}>
          Public Site
        </button>
      </div>
    </section>
  );
}

function AdminPage({ clients, setClients, requests, setRequests, clientLogs, setClientLogs, navigate, session, authReady, setSession }) {
  const [view, setView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 981px)").matches);
  const [clientSearch, setClientSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [clientMessage, setClientMessage] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [pendingActions, setPendingActions] = useState({});
  const [previewRequest, setPreviewRequest] = useState(null);
  const [previewClient, setPreviewClient] = useState(null);

  function isPending(key) {
    return Boolean(pendingActions[key]);
  }

  function setPending(key, value) {
    setPendingActions((items) => ({ ...items, [key]: value }));
  }

  useEffect(() => {
    if (supabaseEnabled && !session) return;
    let active = true;
    setLoading(true);
    fetchAdminData()
      .then((data) => {
        if (!active) return;
        setClients(data.clients);
        setRequests(data.requests);
        setClientLogs(data.clientLogs);
        setAdminMessage("");
      })
      .catch((error) => {
        if (active) setAdminMessage(error.message || "Could not load admin data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, setClients, setRequests, setClientLogs]);

  if (supabaseEnabled && !authReady) {
    return <AdminLoading navigate={navigate} />;
  }

  if (supabaseEnabled && !session) {
    return <AdminLogin navigate={navigate} setSession={setSession} />;
  }

  const stats = useMemo(() => {
    const ready = clients.filter((client) => client.status === "ready").length;
    const open = requests.filter((request) => request.status !== "Completed").length;
    const scheduled = requests.filter((request) => request.status === "Scheduled").length;
    const pdf = clients.length ? Math.round((clients.filter((client) => client.reportPath || client.pdfData).length / clients.length) * 100) : 0;
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
    if (savingClient) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const file = form.pdf.files[0];
    const existing = clients.find((client) => client.id === data.id);
    setClientMessage("");
    setSavingClient(true);
    try {
      const record = await saveClientRecord(data, file, existing);
      setClients((items) => (data.id ? items.map((item) => (item.id === data.id ? record : item)) : [record, ...items]));
      if (!supabaseEnabled) {
        setClientLogs((items) => [
          {
            id: makeId("client-log"),
            clientId: record.id,
            action: data.id ? "updated" : "created",
            clientName: record.name,
            clientPhone: record.phone,
            createdAt: new Date().toISOString()
          },
          ...items
        ]);
      } else {
        fetchAdminData().then((data) => setClientLogs(data.clientLogs)).catch(() => {});
      }
      setEditing(null);
      setClientMessage("Client result record saved.");
      form.reset();
    } catch (error) {
      setClientMessage(error.message || "Could not save client record.");
    } finally {
      setSavingClient(false);
    }
  }

  async function updateRequest(id, status) {
    const key = `request-status-${id}`;
    if (isPending(key)) return;
    const previous = requests;
    setPending(key, true);
    setRequests((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    try {
      await updateRequestStatus(id, status);
    } catch (error) {
      setRequests(previous);
      setAdminMessage(error.message || "Could not update request.");
    } finally {
      setPending(key, false);
    }
  }

  async function deleteRequest(id) {
    const key = `request-delete-${id}`;
    if (isPending(key)) return;
    const previous = requests;
    setPending(key, true);
    setRequests((items) => items.filter((item) => item.id !== id));
    try {
      await deleteRequestRecord(id);
    } catch (error) {
      setRequests(previous);
      setAdminMessage(error.message || "Could not delete request.");
    } finally {
      setPending(key, false);
    }
  }

  async function deleteClient(client) {
    const key = `client-delete-${client.id}`;
    if (isPending(key)) return;
    const previous = clients;
    setPending(key, true);
    setClients((items) => items.filter((item) => item.id !== client.id));
    if (!supabaseEnabled) {
      setClientLogs((items) => [
        {
          id: makeId("client-log"),
          clientId: client.id,
          action: "deleted",
          clientName: client.name,
          clientPhone: client.phone,
          createdAt: new Date().toISOString()
        },
        ...items
      ]);
    }
    try {
      await deleteClientRecord(client);
      if (supabaseEnabled) {
        fetchAdminData().then((data) => setClientLogs(data.clientLogs)).catch(() => {});
      }
    } catch (error) {
      setClients(previous);
      setAdminMessage(error.message || "Could not delete client record.");
    } finally {
      setPending(key, false);
    }
  }

  async function signOut() {
    if (isPending("sign-out")) return;
    setPending("sign-out", true);
    if (supabaseEnabled) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setPending("sign-out", false);
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
            ["reports", "Report Setup", FileCheck2],
            ["logs", "Client Logs", ClipboardCheck]
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
        {supabaseEnabled && (
          <button className="button ghost" type="button" onClick={signOut} disabled={isPending("sign-out")} aria-busy={isPending("sign-out")}>
            {isPending("sign-out") ? "Signing Out..." : "Sign Out"}
          </button>
        )}
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
          {(loading || adminMessage || !supabaseEnabled) && (
            <p className="form-message" role="status">
              {loading ? "Loading admin records..." : adminMessage || "Local development mode: add Supabase env vars to use the backend."}
            </p>
          )}
         
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
                  <strong>{clients.length - clients.filter((client) => client.reportPath || client.pdfData).length} reports missing PDFs</strong>
                  <span>Attach PDFs before marking reports ready.</span>
                </article>
                <article>
                  <CalendarCheck size={22} />
                  <strong>{stats.scheduled} sessions scheduled</strong>
                  <span>Prepare client records after completed sessions.</span>
                </article>
              </div>
            </section>
            <RequestBoard requests={filteredRequests.slice(0, 12)} updateRequest={updateRequest} deleteRequest={deleteRequest} compact onOpenRequest={setPreviewRequest} />
          </div>
        )}

        {view === "requests" && (
          <section className="surface board-panel">
            <BoardHeader title="Request queue" eyebrow="Requests" value={requestSearch} onChange={setRequestSearch} placeholder="Search requests" />
            <RequestWorkspace requests={filteredRequests} updateRequest={updateRequest} deleteRequest={deleteRequest} isPending={isPending} />
          </section>
        )}

        {view === "clients" && (
          <section className="surface table-panel">
            <BoardHeader title="Client records" eyebrow="Records" value={clientSearch} onChange={setClientSearch} placeholder="Search clients" />
            <ClientTable clients={filteredClients} deleteClient={deleteClient} isPending={isPending} onOpenClient={setPreviewClient} setEditing={(client) => {
              setEditing(client);
              setView("reports");
            }} />
          </section>
        )}

        {view === "reports" && (
          <section className="admin-workspace">
            <RecordForm editing={editing} setEditing={setEditing} saveClient={saveClient} savingClient={savingClient} clientMessage={clientMessage} setClientMessage={setClientMessage} />
            <section className="surface table-panel">
              <BoardHeader title="Recent report records" eyebrow="Reports" value={clientSearch} onChange={setClientSearch} placeholder="Search records" />
              <ClientTable clients={filteredClients} deleteClient={deleteClient} isPending={isPending} onOpenClient={setPreviewClient} setEditing={setEditing} />
            </section>
          </section>
        )}

        {view === "logs" && (
          <section className="surface table-panel">
            <div className="list-header">
              <div>
                <p className="eyebrow">Activity</p>
                <h2>Client data log</h2>
              </div>
            </div>
            <ClientLogList logs={clientLogs} />
          </section>
        )}
      </div>
      {previewRequest && (
        <RequestModal request={previewRequest} updateRequest={updateRequest} deleteRequest={deleteRequest} close={() => setPreviewRequest(null)} />
      )}
      {previewClient && (
        <ClientModal client={previewClient} close={() => setPreviewClient(null)} setEditing={(client) => {
          setPreviewClient(null);
          setEditing(client);
          setView("reports");
        }} />
      )}
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

function RequestWorkspace({ requests, updateRequest, deleteRequest, isPending }) {
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [requests]);
  const [selectedId, setSelectedId] = useState(sortedRequests[0]?.id || "");
  const [emailSubject, setEmailSubject] = useState("Service request follow-up");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const selected = sortedRequests.find((request) => request.id === selectedId) || sortedRequests[0];
  const columns = ["New", "Contacted", "Scheduled", "Completed"];

  useEffect(() => {
    if (!sortedRequests.length) {
      setSelectedId("");
      return;
    }

    if (!sortedRequests.some((request) => request.id === selectedId)) {
      setSelectedId(sortedRequests[0].id);
    }
  }, [sortedRequests, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setEmailSubject(`Service request follow-up - ${selected.service}`);
    setEmailBody(`Hello ${selected.name},\n\nThank you for contacting the Special Needs Diagnosis and Therapy Center. We are following up on your request for ${selected.service}.\n\n`);
    setEmailMessage("");
  }, [selected?.id]);

  async function emailRequester() {
    if (!selected || sendingEmail) return;
    setSendingEmail(true);
    setEmailMessage("");
    try {
      await sendRequestEmail({ to: selected.email, subject: emailSubject, message: emailBody });
      setEmailMessage("Email sent.");
    } catch (error) {
      setEmailMessage(error.message || "Could not send email.");
    } finally {
      setSendingEmail(false);
    }
  }

  if (!sortedRequests.length) {
    return <p className="empty-note">No requests found.</p>;
  }

  return (
    <div className="request-workspace">
      <section className="recent-requests-panel" aria-label="Most recent requests">
        <div className="request-section-title">
          <strong>Most recent</strong>
          <span>{sortedRequests.length} total</span>
        </div>
        <div className="recent-request-scroll">
          {sortedRequests.slice(0, 12).map((request) => (
            <button
              className={`recent-request-card ${selected?.id === request.id ? "active" : ""}`}
              key={request.id}
              type="button"
              onClick={() => setSelectedId(request.id)}
            >
              <span className={`status ${request.status === "Completed" ? "ready" : ""}`}>{request.status}</span>
              <strong>{request.name}</strong>
              <small>{request.service}</small>
              <time>{formatDate(request.createdAt)}</time>
            </button>
          ))}
        </div>
      </section>

      <section className="request-detail-layout">
        <div className="request-history-panel">
          <div className="request-section-title">
            <strong>All requests over time</strong>
            <span>Click a row to expand</span>
          </div>
          <div className="request-history-list">
            {sortedRequests.map((request) => (
              <button
                className={`request-history-row ${selected?.id === request.id ? "active" : ""}`}
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
              >
                <strong>{request.name}</strong>
                <span>{request.service}</span>
                <span>{request.phone}</span>
                <time>{formatDate(request.createdAt)}</time>
                <i>{request.status}</i>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <aside className="request-expanded-panel">
            <div className="request-expanded-head">
              <span className={`status ${selected.status === "Completed" ? "ready" : ""}`}>{selected.status}</span>
              <time>{formatDate(selected.createdAt)}</time>
            </div>
            <h3>{selected.name}</h3>
            <dl>
              <div>
                <dt>Service</dt>
                <dd>{selected.service}</dd>
              </div>
              <div>
                <dt>Client type</dt>
                <dd>{selected.clientType}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{selected.urgency || "Routine"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{selected.email}<br />{selected.phone}</dd>
              </div>
            </dl>
            {selected.note && <blockquote>{selected.note}</blockquote>}
            <div className="request-email-panel">
              <strong>Quick email</strong>
              <label>
                Subject
                <input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
              </label>
              <label>
                Message
                <textarea rows="5" value={emailBody} onChange={(event) => setEmailBody(event.target.value)} />
              </label>
              <button className="button primary" type="button" onClick={emailRequester} disabled={sendingEmail} aria-busy={sendingEmail}>
                <Mail size={16} /> {sendingEmail ? "Sending..." : "Email Requester"}
              </button>
              <p className="form-message" role="status">{emailMessage}</p>
            </div>
            <div className="request-expanded-actions">
              <select
                value={selected.status}
                onChange={(event) => updateRequest(selected.id, event.target.value)}
                disabled={isPending(`request-status-${selected.id}`)}
              >
                {columns.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <button
                className="mini-button danger"
                type="button"
                onClick={() => deleteRequest(selected.id)}
                disabled={isPending(`request-delete-${selected.id}`)}
                aria-busy={isPending(`request-delete-${selected.id}`)}
              >
                <Trash2 size={14} /> {isPending(`request-delete-${selected.id}`) ? "Deleting..." : "Delete"}
              </button>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}

function RequestBoard({ requests, updateRequest, deleteRequest, isPending = () => false, compact = false, onOpenRequest = null }) {
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
                {compact ? (
                  <button className="overview-request-row" type="button" onClick={() => onOpenRequest?.(request)}>
                    <strong>{request.name}</strong>
                    <span>{request.phone}</span>
                  </button>
                ) : (
                  <>
                    <div className="request-card-top">
                      <span className="status">{request.urgency || "Routine"}</span>
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                    <h3>{request.name}</h3>
                    <p>{request.service}</p>
                    <p>{request.email} / {request.phone}</p>
                    {request.note && <blockquote>{request.note}</blockquote>}
                  </>
                )}
                <div className="request-actions">
                  <select
                    value={request.status}
                    onChange={(event) => updateRequest(request.id, event.target.value)}
                    disabled={isPending(`request-status-${request.id}`)}
                  >
                    {columns.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    className="mini-button danger"
                    type="button"
                    onClick={() => deleteRequest(request.id)}
                    disabled={isPending(`request-delete-${request.id}`)}
                    aria-busy={isPending(`request-delete-${request.id}`)}
                  >
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

function RequestModal({ request, updateRequest, deleteRequest, close }) {
  const columns = ["New", "Contacted", "Scheduled", "Completed"];
  const subject = `Service request follow-up - ${request.service}`;
  const body = `Hello ${request.name},\n\nThank you for contacting the Special Needs Diagnosis and Therapy Center. We are following up on your request for ${request.service}.\n\n`;

  return (
    <div className="modal-backdrop" role="presentation" onClick={close}>
      <aside className="detail-modal" role="dialog" aria-modal="true" aria-label="Request details" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="status">{request.status}</span>
            <h2>{request.name}</h2>
          </div>
          <button className="mini-button" type="button" onClick={close}>
            <X size={14} /> Close
          </button>
        </div>
        <dl className="detail-list">
          <div><dt>Service</dt><dd>{request.service}</dd></div>
          <div><dt>Client type</dt><dd>{request.clientType}</dd></div>
          <div><dt>Priority</dt><dd>{request.urgency || "Routine"}</dd></div>
          <div><dt>Email</dt><dd>{request.email}</dd></div>
          <div><dt>Phone</dt><dd>{request.phone}</dd></div>
          <div><dt>Created</dt><dd>{formatDate(request.createdAt)}</dd></div>
        </dl>
        {request.note && <blockquote>{request.note}</blockquote>}
        <div className="modal-actions">
          <select value={request.status} onChange={(event) => updateRequest(request.id, event.target.value)}>
            {columns.map((status) => <option key={status}>{status}</option>)}
          </select>
          <a className="button primary" href={gmailComposeUrl(request.email, subject, body)} target="_blank" rel="noreferrer">
            <Mail size={16} /> Open Gmail
          </a>
          <a className="button ghost" href={`tel:${request.phone}`}>
            <Phone size={16} /> Call
          </a>
          <button className="button ghost danger-text" type="button" onClick={() => {
            deleteRequest(request.id);
            close();
          }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </aside>
    </div>
  );
}

function RecordForm({ editing, setEditing, saveClient, savingClient, clientMessage, setClientMessage }) {
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
          {editing?.pdfName && <small>Current file reference: {editing.pdfName}</small>}
        </label>
      </div>
      <div className="form-footer">
        <button className="button primary" type="submit" disabled={savingClient} aria-busy={savingClient}>
          <Upload size={18} /> {savingClient ? "Saving..." : "Save Record"}
        </button>
        <button
          className="button ghost"
          type="button"
          disabled={savingClient}
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

function ClientLogList({ logs }) {
  if (!logs.length) {
    return <p className="empty-note">No client activity has been recorded yet.</p>;
  }

  return (
    <div className="client-log-list">
      {logs.map((log) => (
        <article className="client-log-row" key={log.id}>
          <span className={`log-action ${log.action}`}>{log.action}</span>
          <strong>{log.clientName || "Unknown client"}</strong>
          <span>{log.clientPhone || "No phone"}</span>
          <time>{formatDate(log.createdAt)}</time>
        </article>
      ))}
    </div>
  );
}

function ClientTable({ clients, deleteClient, isPending = () => false, onOpenClient = null, setEditing }) {
  const [openingId, setOpeningId] = useState("");

  async function openReport(client) {
    if (!client.reportPath && !client.pdfData) return;
    if (client.pdfData) {
      window.open(client.pdfData, "_blank", "noopener,noreferrer");
      return;
    }

    setOpeningId(client.id);
    try {
      const url = await getReportUrl(client);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId("");
    }
  }

  return (
    <div className="client-list">
      {clients.length ? (
        clients.map((client, index) => (
          <article className="client-list-row" key={client.id}>
            <button className="client-list-main" type="button" onClick={() => onOpenClient?.(client)}>
              <span>{index + 1}</span>
              <strong>{client.name}</strong>
              <small>{client.phone}</small>
              <i className={`status ${client.status === "ready" ? "ready" : ""}`}>
                {client.status === "ready" ? "Ready" : "Not ready"}
              </i>
            </button>
            <div className="row-actions">
              {client.reportPath || client.pdfData ? (
                <button className="mini-button" type="button" onClick={() => openReport(client)}>
                  {openingId === client.id ? "Opening..." : "PDF"}
                </button>
              ) : (
                <span className="mini-muted">No PDF</span>
              )}
              <button className="mini-button" type="button" onClick={() => setEditing(client)} disabled={isPending(`client-delete-${client.id}`)}>Edit</button>
            </div>
          </article>
        ))
      ) : (
        <p className="empty-note">No client records found.</p>
      )}
    </div>
  );
}

function ClientModal({ client, close, setEditing }) {
  const subject = `Result record follow-up - ${client.name}`;
  const body = `Hello ${client.name},\n\nWe are contacting you from the Special Needs Diagnosis and Therapy Center regarding your result record.\n\n`;

  return (
    <div className="modal-backdrop" role="presentation" onClick={close}>
      <aside className="detail-modal" role="dialog" aria-modal="true" aria-label="Client details" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className={`status ${client.status === "ready" ? "ready" : ""}`}>{client.status === "ready" ? "Ready" : "Not ready"}</span>
            <h2>{client.name}</h2>
          </div>
          <button className="mini-button" type="button" onClick={close}>
            <X size={14} /> Close
          </button>
        </div>
        <dl className="detail-list">
          <div><dt>Email</dt><dd>{client.email}</dd></div>
          <div><dt>Phone</dt><dd>{client.phone}</dd></div>
          <div><dt>Password</dt><dd>{client.password}</dd></div>
          <div><dt>PDF</dt><dd>{client.pdfName || "No file"}</dd></div>
          {client.reportExpiresAt && <div><dt>Expires</dt><dd>{formatDate(client.reportExpiresAt)}</dd></div>}
        </dl>
        <div className="modal-actions">
          <a className="button primary" href={gmailComposeUrl(client.email, subject, body)} target="_blank" rel="noreferrer">
            <Mail size={16} /> Open Gmail
          </a>
          <a className="button ghost" href={`tel:${client.phone}`}>
            <Phone size={16} /> Call
          </a>
          <button className="button ghost" type="button" onClick={() => setEditing(client)}>Edit Record</button>
        </div>
      </aside>
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
