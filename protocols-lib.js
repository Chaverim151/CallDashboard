// protocols-lib.js — builds the Protocol Search index from the NJ EMS protocol PDF.
// Shared by protocols.html (rebuilds on a device when the PDF changes) and the admin panel
// (Admin ▸ Protocol Search ▸ upload a new PDF). Plain functions, no page dependencies.
// ── Protocol index (v2): the PDF split into whole protocols, each with its lines in order (and the
//    page each line is on), its level-of-care sections, and search passages. Used by the page (to
//    rebuild when the PDF changes) and to pre-build protocols-index.json. ──
function protoLinesFromText(tc) {
  var rows = [];
  tc.items.forEach(function(it) {
    if (typeof it.str !== "string" || !it.str.trim()) return;
    var y = Math.round(it.transform[5]), x = it.transform[4];
    var row = rows.filter(function(r) { return Math.abs(r.y - y) <= 2; })[0];
    if (!row) { row = { y: y, parts: [] }; rows.push(row); }
    row.parts.push({ x: x, s: it.str });
  });
  rows.sort(function(a, b) { return b.y - a.y; });
  return rows.map(function(r) {
    r.parts.sort(function(a, b) { return a.x - b.x; });
    return r.parts.map(function(p) { return p.s; }).join(" ").replace(/\s+/g, " ").trim();
  }).filter(Boolean);
}
// Level-of-care headings, as written in the NJ protocol (every variant found in the document).
var PROTO_SECTION_RE = [
  [/^EMT\b(?!.*\bPARAMEDIC\b)/i, "EMT"],
  [/^(PARAMEDIC|MICN)\b/i, "ALS"],
  [/^COMMUNICATION FAILURE\b/i, "CF"],
  [/^PEARLS\b/i, "PEARLS"]
];
function protoLevelOf(line) {
  if (line.length > 60) return null;
  for (var i = 0; i < PROTO_SECTION_RE.length; i++) if (PROTO_SECTION_RE[i][0].test(line)) return PROTO_SECTION_RE[i][1];
  return null;
}
var PROTO_HEAD_RE = /^(\d{1,2})\.\s?(\d{1,2}[A-Z]?)\s+([A-Z][A-Z0-9 ,'’&\/()\-–—.:]{3,})$/;   // "2.2", also "2. 14" as printed on p. 65
function protoBuildIndex(pageLines, source) {
  var protocols = [], sections = [], cur = null;
  function open(num, title, n) { cur = { num: num, title: title, pages: [n], lines: [] }; protocols.push(cur); }
  open("", "Introduction & definitions", 1);
  pageLines.forEach(function(raw, i) {
    var n = i + 1;
    var lines = raw.filter(function(l) { return !/^NJ EMS Clinical Practice Protocols/i.test(l) && !/^Page \d+ of\s*\d*$/i.test(l) && !/^\d{1,3}$/.test(l); });
    if (n <= 6) lines.forEach(function(l) { var m = /^Section (\d+)\s*[–-]?\s*(.+)$/.exec(l); if (m && !sections.some(function(s) { return s.n === m[1]; })) sections.push({ n: m[1], name: m[2].trim() }); });
    for (var k = 0; k < lines.length; k++) {
      var l = lines[k], m = PROTO_HEAD_RE.exec(l);
      if (m && n > 6) {
        var num = m[1] + "." + m[2], title = m[3].trim();
        // Titles that wrap onto the next line: "… (UNKNOWN ETIOLOGY) –" + "ADULT", "… PRESSURE" + "(CPAP/BiPAP)".
        while (k + 1 < lines.length && !protoLevelOf(lines[k + 1]) &&
               ((/[–—\-,&\/]$/.test(title) && /^[A-Z(][A-Z0-9 ,'’&\/()\-–—.]{1,40}$/.test(lines[k + 1])) || /^\([^)]{2,30}\)$/.test(lines[k + 1]))) { title += " " + lines[k + 1].trim(); k++; }
        title = title.replace(/\s+/g, " ");
        var same = cur && cur.num === num && cur.title.replace(/\W/g, "") === title.replace(/\W/g, "");
        if (!same) open(num, title, n);
        continue;
      }
      if (cur.pages[cur.pages.length - 1] !== n) cur.pages.push(n);
      cur.lines.push([n, l]);
    }
  });
  // Levels: a protocol's section headings set the level of what follows, across its page breaks.
  // A protocol with paramedic sections and no EMT section is paramedic-only throughout.
  var passages = [];
  protocols.forEach(function(pr, k) {
    var level = "ALL", has = {};
    pr.lines.forEach(function(ln) { var lv = protoLevelOf(ln[1]); if (lv) { level = lv; has[lv] = 1; ln.push("H"); } ln.push(level); });
    // Paramedic-only: the protocol opens with a PARAMEDIC heading (and never has an EMT section), or its
    // title says "ALS ONLY". Protocols like Routine Patient Care start with shared steps and are not.
    pr.alsOnly = !!((pr.lines.length && pr.lines[0][2] === "H" && pr.lines[0][3] === "ALS" && !has.EMT) || /ALS ONLY/i.test(pr.title));
    pr.levels = Object.keys(has);
    var cur2 = null;
    function flush() { if (cur2 && cur2.text.replace(/\s/g, "").length > 12) passages.push(cur2); cur2 = null; }
    pr.lines.forEach(function(ln) {
      if (ln[2] === "H") { flush(); return; }
      var lv = ln[ln.length - 1], effective = (pr.alsOnly && (lv === "ALL" || lv === "PEARLS")) ? "ALS" : lv;
      var starts = /^\d{1,2}\.\s+\S/.test(ln[1]) || /^[A-Z][A-Z \/&\-–]{6,}$/.test(ln[1]);
      if (!cur2 || starts || cur2.text.length > 650 || cur2.lv !== effective) { flush(); cur2 = { k: k, p: ln[0], lv: effective, text: ln[1] }; }
      else cur2.text += " " + ln[1];
    });
    flush();
  });
  return { v: 2, source: source || {}, builtAt: new Date().toISOString(), pageCount: pageLines.length, sections: sections, protocols: protocols, passages: passages };
}
