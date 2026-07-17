// Minimal client-side parser for classic libpcap (.pcap) captures. Produces a DEFENSIVE traffic
// SUMMARY (flows, top talkers/ports, protocol mix, TCP-scan heuristics) — never packet payloads — so
// only an anonymised summary is ever sent to the model. PCAPNG is detected and reported.

const ipStr = (v, o) => `${v.getUint8(o)}.${v.getUint8(o + 1)}.${v.getUint8(o + 2)}.${v.getUint8(o + 3)}`;
const ip6Str = (v, o) => {
  const p = [];
  for (let i = 0; i < 8; i++) p.push(v.getUint16(o + i * 2).toString(16));
  return p.join(":").replace(/(^|:)(0:){2,}/, "::");
};

export function parsePcap(buf) {
  const dv = new DataView(buf);
  const fail = (error) => ({ ok: false, error });
  if (buf.byteLength < 24) return fail("File too small to be a pcap.");
  const magic = dv.getUint32(0, false);
  if (magic === 0x0a0d0d0a) return fail("This is a PCAPNG file. In Wireshark use File → Save As → 'Wireshark/tcpdump/… - pcap' to export a classic .pcap, then retry.");
  let le;
  if (magic === 0xa1b2c3d4 || magic === 0xa1b23c4d) le = false;
  else if (magic === 0xd4c3b2a1 || magic === 0x4d3cb2a1) le = true;
  else return fail("Not a recognised pcap file (bad magic).");
  const linkType = dv.getUint32(20, le);

  const proto = {};
  const talk = {};
  const ports = {};
  const scanMap = {};
  let packets = 0;
  let bytes = 0;
  let tStart = 0;
  let tEnd = 0;
  let tcpSyn = 0;
  let tcpSynAck = 0;

  let off = 24;
  const MAX = 500000;
  while (off + 16 <= buf.byteLength && packets < MAX) {
    const tsSec = dv.getUint32(off, le);
    const inclLen = dv.getUint32(off + 8, le);
    const origLen = dv.getUint32(off + 12, le);
    off += 16;
    if (inclLen === 0 || off + inclLen > buf.byteLength) break;
    const base = off;
    off += inclLen;
    packets++;
    bytes += origLen || inclLen;
    if (!tStart) tStart = tsSec;
    tEnd = tsSec;

    let l3 = base;
    let etherType = 0;
    if (linkType === 1) {
      if (inclLen < 14) continue;
      etherType = dv.getUint16(base + 12, false);
      l3 = base + 14;
    } else {
      etherType = (dv.getUint8(base) >> 4) === 6 ? 0x86dd : 0x0800;
    }

    if (etherType === 0x0806) { proto.ARP = (proto.ARP || 0) + 1; continue; }
    let src = "";
    let dst = "";
    let l4Proto = 0;
    let l4 = 0;
    if (etherType === 0x0800) {
      if (l3 + 20 > buf.byteLength) continue;
      const ihl = (dv.getUint8(l3) & 0x0f) * 4;
      l4Proto = dv.getUint8(l3 + 9);
      src = ipStr(dv, l3 + 12);
      dst = ipStr(dv, l3 + 16);
      l4 = l3 + ihl;
    } else if (etherType === 0x86dd) {
      if (l3 + 40 > buf.byteLength) continue;
      l4Proto = dv.getUint8(l3 + 6);
      src = ip6Str(dv, l3 + 8);
      dst = ip6Str(dv, l3 + 24);
      l4 = l3 + 40;
    } else {
      proto.OTHER = (proto.OTHER || 0) + 1;
      continue;
    }

    (talk[src] ||= { p: 0, b: 0 }).p++;
    talk[src].b += inclLen;

    if (l4Proto === 6 && l4 + 14 <= buf.byteLength) {
      proto.TCP = (proto.TCP || 0) + 1;
      const dport = dv.getUint16(l4 + 2, false);
      const flags = dv.getUint8(l4 + 13);
      const syn = (flags & 0x02) !== 0;
      const ack = (flags & 0x10) !== 0;
      if (syn && !ack) tcpSyn++;
      if (syn && ack) tcpSynAck++;
      (ports[`TCP:${dport}`] ||= { proto: "TCP", port: dport, p: 0 }).p++;
      if (syn && !ack) {
        const sm = (scanMap[src] ||= { ports: new Set(), hosts: new Set() });
        sm.ports.add(dport);
        sm.hosts.add(dst);
      }
    } else if (l4Proto === 17 && l4 + 8 <= buf.byteLength) {
      proto.UDP = (proto.UDP || 0) + 1;
      const dport = dv.getUint16(l4 + 2, false);
      (ports[`UDP:${dport}`] ||= { proto: "UDP", port: dport, p: 0 }).p++;
    } else if (l4Proto === 1 || l4Proto === 58) {
      proto.ICMP = (proto.ICMP || 0) + 1;
    } else {
      proto.OTHER = (proto.OTHER || 0) + 1;
    }
  }

  if (!packets) return fail("No packets could be parsed from this file.");

  const topTalkers = Object.entries(talk).map(([addr, v]) => ({ addr, packets: v.p, bytes: v.b })).sort((a, b) => b.packets - a.packets).slice(0, 10);
  const topPorts = Object.values(ports).map((v) => ({ port: v.port, proto: v.proto, packets: v.p })).sort((a, b) => b.packets - a.packets).slice(0, 12);
  const scanners = Object.entries(scanMap).map(([src, v]) => ({ src, distinctDstPorts: v.ports.size, distinctDstHosts: v.hosts.size }))
    .filter((s) => s.distinctDstPorts >= 10 || s.distinctDstHosts >= 10).sort((a, b) => b.distinctDstPorts - a.distinctDstPorts).slice(0, 8);
  const durationSec = Math.max(0, tEnd - tStart);

  // ── Heuristic ATTACK INDICATORS (defensive triage — flags, not verdicts) ──────────────────────────
  const SERVICES = { 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB", 1433: "MSSQL", 3306: "MySQL", 3389: "RDP", 5432: "Postgres", 6379: "Redis", 8080: "HTTP-alt" };
  const PLAINTEXT = new Set([21, 23, 25, 80, 110, 143]);
  const rate = packets / Math.max(1, durationSec);
  const synRatio = tcpSyn / Math.max(1, tcpSynAck);
  const avgPkt = bytes / Math.max(1, packets);
  const topShare = topTalkers.length ? topTalkers[0].packets / packets : 0;
  const bruteTargets = topPorts.filter((p2) => p2.proto === "TCP" && [22, 3389, 21, 445, 3306, 1433, 5432].includes(p2.port) && p2.packets > 200);
  const plaintextPorts = topPorts.filter((p2) => PLAINTEXT.has(p2.port));
  const ind = [];
  if (tcpSyn > 200 && synRatio > 4) ind.push(`SYN flood / half-open pattern: ${tcpSyn} SYNs vs ${tcpSynAck} SYN-ACKs (ratio ${synRatio.toFixed(1)}) — classic TCP SYN-flood (DDoS/DoS) signature.`);
  if (rate > 2000 && avgPkt < 200 && topShare < 0.4) ind.push(`High-rate small-packet flood: ~${Math.round(rate)} pkt/s, avg ${Math.round(avgPkt)}B, many sources — volumetric DDoS signature.`);
  if ((proto.ICMP || 0) > 500 && (proto.ICMP || 0) / packets > 0.4) ind.push(`ICMP flood: ${proto.ICMP} ICMP packets (${Math.round(((proto.ICMP || 0) / packets) * 100)}% of traffic) — ping/ICMP flood.`);
  for (const s of scanners) {
    if (s.distinctDstPorts >= 15) ind.push(`Port scan: ${s.src} sent SYNs to ${s.distinctDstPorts} distinct ports — vertical port scan (reconnaissance).`);
    if (s.distinctDstHosts >= 15) ind.push(`Host sweep: ${s.src} probed ${s.distinctDstHosts} distinct hosts — horizontal sweep (reconnaissance).`);
  }
  for (const b of bruteTargets) ind.push(`Possible brute force: ${b.packets} packets to ${SERVICES[b.port] || "TCP/" + b.port} (${b.port}) — repeated auth attempts against a login service.`);
  if (plaintextPorts.length) ind.push(`Plaintext services in use: ${plaintextPorts.map((p2) => `${SERVICES[p2.port] || p2.port}`).join(", ")} — credentials/data may be exposed in clear.`);
  const dns = topPorts.find((p2) => p2.port === 53);
  if (dns && dns.packets > 1000 && dns.packets / packets > 0.5) ind.push(`Heavy DNS volume: ${dns.packets} packets — possible DNS tunneling / exfiltration or DNS-based DDoS.`);

  const text = [
    `Capture summary: ${packets} packets, ${(bytes / 1024).toFixed(1)} KB, ~${durationSec}s (~${Math.round(rate)} pkt/s, avg ${Math.round(avgPkt)}B).`,
    `Protocol mix: ${Object.entries(proto).map(([k, v]) => `${k}=${v}`).join(", ") || "n/a"}.`,
    `TCP flags: ${tcpSyn} SYN (no ACK), ${tcpSynAck} SYN-ACK (SYN/SYN-ACK ratio ${synRatio.toFixed(1)}).`,
    `Top talkers (src → packets/bytes): ${topTalkers.map((t2) => `${t2.addr} (${t2.packets}p/${(t2.bytes / 1024).toFixed(0)}KB)`).join(", ")}.`,
    `Top destination ports: ${topPorts.map((p2) => `${p2.proto}/${p2.port}${SERVICES[p2.port] ? " " + SERVICES[p2.port] : ""} (${p2.packets})`).join(", ")}.`,
    scanners.length ? `Scan heuristics: ${scanners.map((s) => `${s.src} → ${s.distinctDstPorts} ports / ${s.distinctDstHosts} hosts`).join(", ")}.` : `No obvious port-scan pattern.`,
    ind.length ? `ATTACK INDICATORS:\n- ${ind.join("\n- ")}` : `ATTACK INDICATORS: none of the built-in heuristics fired (does not rule out an attack).`,
  ].join("\n");

  return { ok: true, packets, bytes, durationSec, protocols: proto, topTalkers, topPorts, tcpSyn, tcpSynAck, scanners, indicators: ind, text };
}
