// Handover: a guided handover document for leave or a job change, with a completeness check and export.
import { download, uid, useCopy, useStored } from "./lib/store";
import { Section } from "./ui/kit";

const T = "handover";
type Row = Record<string, string> & { id: string };
type Doc = { person: string; role: string; cover: string; from: string; to: string; summary: string; tables: Record<string, Row[]> };
const TABLES: { key: string; title: string; hint: string; cols: [string, string][] }[] = [
  { key: "tasks", title: "Recurring tasks", hint: "Anything that breaks if nobody does it.", cols: [["task", "Task"], ["when", "How often"], ["how", "How to do it"], ["where", "Where"]] },
  { key: "projects", title: "Work in flight", hint: "Projects mid-way, with the very next step.", cols: [["name", "Project"], ["status", "Status"], ["next", "Next step"], ["due", "Deadline"]] },
  { key: "people", title: "People to know", hint: "Who to ask, and what about.", cols: [["name", "Name"], ["role", "Role"], ["about", "Ask them about"], ["contact", "Contact"]] },
  { key: "systems", title: "Tools and access", hint: "Where the work happens and who can grant access. No passwords here.", cols: [["tool", "Tool"], ["use", "Used for"], ["access", "Who grants access"]] },
  { key: "files", title: "Where things live", hint: "Folders, drives, dashboards.", cols: [["what", "What"], ["where", "Link or path"]] },
];
const SAMPLE: Doc = {
  person: "Leila Haddad", role: "Operations lead", cover: "Youssef Amri", from: "2026-10-12", to: "2026-11-06",
  summary: "Parental leave for four weeks. Payroll and supplier invoices are the only things with hard deadlines.",
  tables: {
    tasks: [{ id: "t1", task: "Run payroll", when: "Monthly, by the 25th", how: "Export hours from Timesheet, check overtime, submit in Payfit", where: "Payfit" }, { id: "t2", task: "Approve supplier invoices", when: "Every Thursday", how: "Check against PO, approve under 2,000", where: "Finance inbox" }],
    projects: [{ id: "p1", name: "New courier contract", status: "Two quotes in, waiting on Aramex", next: "Chase Aramex on Oct 14", due: "Oct 31" }],
    people: [{ id: "h1", name: "Sonia", role: "Accountant", about: "Invoices over 2,000", contact: "sonia@example.com" }],
    systems: [{ id: "s1", tool: "Payfit", use: "Payroll", access: "Karim (CEO)" }],
    files: [{ id: "f1", what: "Supplier contracts", where: "Drive / Ops / Contracts" }],
  },
};

function toMarkdown(d: Doc) {
  const out = [`# Handover: ${d.person}`, "", `**Role:** ${d.role}  `, `**Away:** ${d.from} to ${d.to}  `, `**Covering:** ${d.cover}`, "", d.summary, ""];
  TABLES.forEach(t => {
    const rows = d.tables[t.key] ?? [];
    if (!rows.length) return;
    out.push(`## ${t.title}`, "", `| ${t.cols.map(c => c[1]).join(" | ")} |`, `| ${t.cols.map(() => "---").join(" | ")} |`);
    rows.forEach(r => out.push(`| ${t.cols.map(c => (r[c[0]] || "").replace(/\|/g, "/")).join(" | ")} |`));
    out.push("");
  });
  return out.join("\n");
}

export default function Handover() {
  const [doc, setDoc] = useStored<Doc>(T, "doc", SAMPLE);
  const { copy, copied } = useCopy();
  const set = (p: Partial<Doc>) => setDoc({ ...doc, ...p });
  const setRows = (key: string, rows: Row[]) => set({ tables: { ...doc.tables, [key]: rows } });
  const checks: [string, boolean][] = [
    ["Who is covering", !!doc.cover.trim()], ["Dates", !!doc.from && !!doc.to], ["Summary", doc.summary.trim().length > 20],
    ...TABLES.map(t => [t.title, (doc.tables[t.key] ?? []).some(r => t.cols.every(c => (r[c[0]] || "").trim()))] as [string, boolean]),
  ];
  const score = Math.round((checks.filter(c => c[1]).length / checks.length) * 100);

  return (
    <div className="stack">
      <Section title="How complete is it?" aside={<>
        <button className="btn small" onClick={() => copy(toMarkdown(doc))}>{copied ? "Copied" : "Copy as text"}</button>
        <button className="btn small" onClick={() => download(`handover-${doc.person.toLowerCase().replace(/\s+/g, "-")}.md`, toMarkdown(doc), "text/markdown")}>Download</button>
        <button className="btn small" onClick={() => window.print()}>Print</button>
      </>}>
        <div className="ho-meter"><span style={{ width: `${score}%`, background: score === 100 ? "var(--good)" : score > 60 ? "var(--warn)" : "var(--bad)" }} /></div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>{checks.map(([n, ok]) => <span key={n} className={"pill " + (ok ? "good" : "")}>{ok ? "Done: " : "Missing: "}{n}</span>)}</div>
      </Section>
      <Section title="Overview">
        <div className="stack" style={{ gap: 10 }}>
          <div className="row">
            <label className="field"><span>Your name</span><input id="ho-p" className="input" value={doc.person} onChange={e => set({ person: e.target.value })} /></label>
            <label className="field"><span>Role</span><input id="ho-r" className="input" value={doc.role} onChange={e => set({ role: e.target.value })} /></label>
            <label className="field"><span>Covering for you</span><input id="ho-c" className="input" value={doc.cover} onChange={e => set({ cover: e.target.value })} /></label>
          </div>
          <div className="row">
            <label className="field"><span>Away from</span><input id="ho-f" type="date" className="input" value={doc.from} onChange={e => set({ from: e.target.value })} /></label>
            <label className="field"><span>Back on (leave empty if leaving)</span><input id="ho-t" type="date" className="input" value={doc.to} onChange={e => set({ to: e.target.value })} /></label>
          </div>
          <label className="field"><span>Summary: what matters most while you are away</span><textarea id="ho-s" className="input" rows={3} value={doc.summary} onChange={e => set({ summary: e.target.value })} /></label>
        </div>
      </Section>
      {TABLES.map(t => {
        const rows = doc.tables[t.key] ?? [];
        return (
          <Section key={t.key} title={t.title} aside={<span className="note">{t.hint}</span>}>
            <div className="table-wrap"><table className="t">
              <thead><tr>{t.cols.map(c => <th key={c[0]}>{c[1]}</th>)}<th /></tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.id}>{t.cols.map(c => <td key={c[0]}><textarea className="input ho-cell" rows={1} aria-label={c[1]} value={r[c[0]] ?? ""} onChange={e => setRows(t.key, rows.map(x => x.id === r.id ? { ...x, [c[0]]: e.target.value } : x))} /></td>)}
                  <td><button className="btn ghost small danger" onClick={() => setRows(t.key, rows.filter(x => x.id !== r.id))}>Remove</button></td></tr>
              ))}</tbody>
            </table></div>
            <button className="btn small" style={{ marginTop: 10 }} onClick={() => setRows(t.key, [...rows, { id: uid() } as Row])}>Add a row</button>
          </Section>
        );
      })}
      <style>{`.ho-meter{height:12px;background:var(--sunk);border-radius:6px;overflow:hidden}.ho-meter span{display:block;height:100%}.ho-cell{min-height:40px;min-width:140px;resize:vertical;font-size:14px}`}</style>
    </div>
  );
}
