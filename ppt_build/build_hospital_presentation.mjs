import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT = 'C:/Users/shubham/OneDrive/Desktop/HOSPITAL MANGEMENT\'/Hospital_Management_System_Presentation.pptx';
const BUILD = 'C:/Users/shubham/OneDrive/Desktop/HOSPITAL MANGEMENT\'/ppt_build';
const W = 1280, H = 720;
const C = { navy: '#0E2A47', teal: '#0B8A8F', sky: '#EAF5F7', ink: '#132238', muted: '#5E7184', line: '#D9E4EA', white: '#FFFFFF', pale: '#F7FAFC', green: '#237A57' };

async function saveBlob(path, blob) { await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer())); }
function shape(slide, geometry, left, top, width, height, fill, line = 'none') {
  return slide.shapes.add({ geometry, position: { left, top, width, height }, fill, line: { style: 'solid', fill: line, width: line === 'none' ? 0 : 1 }, borderRadius: geometry === 'roundRect' ? 'rounded-xl' : undefined });
}
function text(slide, value, left, top, width, height, size = 20, color = C.ink, bold = false, align = 'left') {
  const s = shape(slide, 'textbox', left, top, width, height, 'none');
  s.text = value;
  s.text.style = { fontSize: size, color, bold, alignment: align, fontFace: 'Aptos' };
  return s;
}
function title(slide, t, sub = '') {
  text(slide, t, 72, 48, 1060, 54, 36, C.navy, true);
  if (sub) text(slide, sub, 72, 108, 1060, 28, 18, C.muted);
  shape(slide, 'rect', 72, 148, 1136, 3, C.teal);
}
function footer(slide, n) { text(slide, `CITY HOSPITAL  |  HOSPITAL MANAGEMENT SYSTEM`, 72, 680, 760, 18, 11, C.muted, true); text(slide, String(n).padStart(2, '0'), 1162, 680, 46, 18, 11, C.muted, true, 'right'); }
function bullet(slide, lead, body, x, y, w) {
  shape(slide, 'ellipse', x, y + 8, 10, 10, C.teal);
  text(slide, lead, x + 24, y, w - 24, 28, 20, C.ink, true);
  text(slide, body, x + 24, y + 30, w - 24, 43, 16, C.muted);
}
function chip(slide, label, x, y, w, accent = C.sky) {
  shape(slide, 'roundRect', x, y, w, 48, accent, C.line);
  text(slide, label, x + 10, y + 12, w - 20, 22, 16, C.navy, true, 'center');
}

async function main() {
  await fs.mkdir(BUILD, { recursive: true });
  const p = Presentation.create({ slideSize: { width: W, height: H } });
  const add = () => { const s = p.slides.add(); s.background.fill = C.white; return s; };

  { const s = add();
    shape(s, 'rect', 0, 0, 26, H, C.teal); shape(s, 'roundRect', 750, 104, 390, 390, C.sky, C.line);
    shape(s, 'ellipse', 858, 160, 174, 174, C.white, C.teal);
    text(s, '+', 875, 164, 140, 160, 122, C.teal, false, 'center');
    text(s, 'City Hospital', 84, 144, 570, 34, 24, C.teal, true);
    text(s, 'Hospital\nManagement\nSystem', 80, 198, 620, 230, 59, C.navy, true);
    text(s, 'A web-based platform for connected patient care, clinical workflows and hospital operations.', 84, 474, 535, 70, 21, C.muted);
    text(s, 'Project Presentation  |  2026', 84, 588, 430, 28, 17, C.ink, true);
    text(s, 'Presented by: Team Members', 84, 625, 430, 24, 16, C.muted);
  }
  { const s = add(); title(s, 'The project brings hospital work into one connected system', 'A single web application serves patients, doctors and administrators.');
    const items = [ ['Patient access', 'Register, log in, explore doctors and book appointments online.'], ['Clinical workflow', 'Doctors view schedules, update profiles and manage prescriptions.'], ['Operational control', 'Admins manage departments, doctors, patients, appointments and bills.'] ];
    items.forEach((it, i) => { const x = 72 + i * 382; shape(s, 'roundRect', x, 218, 334, 260, C.pale, C.line); text(s, String(i + 1).padStart(2,'0'), x + 28, 244, 60, 28, 17, C.teal, true); text(s, it[0], x + 28, 300, 270, 58, 25, C.navy, true); text(s, it[1], x + 28, 374, 274, 74, 17, C.muted); }); footer(s,2); }
  { const s = add(); title(s, 'The user experience is organized around three roles', 'Each role sees only the actions and information needed for its workflow.');
    const roles = [['Patient','Register • Login • Book appointment • Health profile • Appointment history'], ['Doctor','Login • Dashboard • Profile • Appointment list • Prescriptions'], ['Administrator','Login • Departments • Doctors • Patients • Appointments • Billing']];
    roles.forEach((r,i) => { const y=190+i*135; shape(s,'roundRect',72,y,1136,106,i===1?C.sky:C.pale,C.line); text(s,`0${i+1}`,100,y+35,64,28,20,C.teal,true); text(s,r[0],206,y+26,220,32,26,C.navy,true); text(s,r[1],454,y+28,692,54,18,C.muted); }); footer(s,3); }
  { const s = add(); title(s, 'Frontend implementation makes core tasks simple to complete', 'Browser pages are built with HTML, CSS and JavaScript and communicate with REST APIs.');
    const pages = ['Home & Departments','Doctor Directory','Appointment Booking','Patient Dashboard','Doctor Dashboard','Admin Panel'];
    pages.forEach((v,i) => chip(s,v,72+(i%3)*382,200+Math.floor(i/3)*90,334));
    text(s,'Frontend highlights',72,420,260,32,25,C.navy,true);
    bullet(s,'Role-aware navigation','Local storage keeps the active user session and directs each role to its dashboard.',72,474,540);
    bullet(s,'Interactive booking','The booking modal loads doctors and submits appointment requests without page reloads.',632,474,530);
    footer(s,4); }
  { const s = add(); title(s, 'Express powers a clear API layer for hospital operations', 'The Node.js backend validates requests, queries MySQL and returns JSON responses to the browser.');
    const api = [['GET','/api/departments & /api/doctors'],['POST','/api/patients & /api/doctors'],['POST','/api/appointments'],['PUT','/api/appointments/:id/status'],['POST / PUT','prescriptions and bills'],['GET','/api/bills/:id/pdf']];
    api.forEach((a,i)=>{const x=72+(i%2)*568,y=190+Math.floor(i/2)*105;shape(s,'roundRect',x,y,528,72,C.pale,C.line);text(s,a[0],x+22,y+23,106,24,16,C.teal,true);text(s,a[1],x+142,y+21,360,27,17,C.ink,true);});
    text(s,'Validation protects the workflow: valid IDs, required fields, appointment states, password length and duplicate-slot checks.',72,540,1080,48,20,C.muted); footer(s,5); }
  { const s = add(); title(s, 'MySQL stores the core clinical and operational records', 'The schema links people, appointments, prescriptions and billing through primary and foreign keys.');
    const rows=[['admins','Administrative credentials'],['departments','Department name and location'],['doctors','Doctor profile and department relationship'],['patients','Contact, health and emergency details'],['appointments','Patient–doctor date, time and status'],['prescriptions / bills','One record per appointment; clinical advice and payment tracking']];
    rows.forEach((r,i)=>{const y=182+i*66;shape(s,'roundRect',72,y,1136,50,i%2?C.pale:C.white,C.line);text(s,r[0],96,y+13,285,22,17,C.navy,true);text(s,r[1],420,y+13,720,22,16,C.muted);});footer(s,6); }
  { const s = add(); title(s, 'Database integration connects every user action to a reliable record', 'The application uses mysql2 and environment-based database configuration.');
    // connectors are created before their nodes
    shape(s,'rect',309,316,180,3,C.line); shape(s,'rect',590,316,180,3,C.line); shape(s,'rect',871,316,180,3,C.line);
    const steps=[['Frontend','Forms and dashboards'],['Express API','Validation and routes'],['MySQL','Tables and relations'],['Response','Updated UI / PDF bill']];
    steps.forEach((r,i)=>{const x=72+i*281;shape(s,'roundRect',x,240,216,154,i===2?C.sky:C.pale,C.line);text(s,`0${i+1}`,x+18,262,60,20,15,C.teal,true);text(s,r[0],x+18,302,178,30,22,C.navy,true,'center');text(s,r[1],x+18,342,178,36,15,C.muted,false,'center');});
    text(s,'Example flow: patient selects a doctor and time → API checks the doctor’s availability → MySQL creates the appointment → the updated schedule is returned.',108,500,1054,60,21,C.ink,false,'center'); footer(s,7); }
  { const s = add(); title(s, 'Appointment booking is protected by business rules', 'A booking remains reliable even when multiple users request the same doctor and time.');
    const steps=[['1','Patient selects doctor, date and time'],['2','API validates IDs, formats and status'],['3','Database checks active slot availability'],['4','New appointment is created or conflict is returned']];
    steps.forEach((r,i)=>{const x=72+i*281;shape(s,'ellipse',x+72,220,72,72,C.teal);text(s,r[0],x+72,239,72,30,22,C.white,true,'center');text(s,r[1],x+6,322,204,62,18,C.navy,true,'center');});
    shape(s,'roundRect',190,454,900,78,C.sky,C.line);text(s,'Statuses are controlled as Pending, Confirmed or Cancelled, keeping appointments consistent across the system.',224,477,830,28,20,C.navy,true,'center');footer(s,8); }
  { const s = add(); title(s, 'Key modules cover the full journey from registration to billing', 'The project is designed as a connected operational workflow—not isolated pages.');
    const mods=[['Patient management','Registration, profiles, health information and emergency contacts'],['Doctor management','Department assignment, doctor profiles and scheduled appointments'],['Clinical records','Diagnosis, medicines and instructions saved against an appointment'],['Billing','Bill generation, payment status and downloadable PDF bills']];
    mods.forEach((m,i)=>{const x=72+(i%2)*568,y=190+Math.floor(i/2)*180;shape(s,'roundRect',x,y,528,136,C.pale,C.line);text(s,m[0],x+26,y+24,460,28,23,C.navy,true);text(s,m[1],x+26,y+70,464,44,17,C.muted);});footer(s,9); }
  { const s = add(); title(s, 'Team contribution areas', 'Replace the placeholders below with your real names and individual responsibilities.');
    const team=[['Team Member 1','Frontend design & user interface'],['Team Member 2','Backend APIs & validation'],['Team Member 3','MySQL database & integration'],['Team Member 4','Testing, documentation & presentation']];
    team.forEach((m,i)=>{const x=72+(i%2)*568,y=192+Math.floor(i/2)*170;shape(s,'roundRect',x,y,528,126,C.pale,C.line);shape(s,'ellipse',x+25,y+28,66,66,C.sky,C.teal);text(s,`T${i+1}`,x+25,y+48,66,22,16,C.teal,true,'center');text(s,m[0],x+118,y+30,350,26,22,C.navy,true);text(s,m[1],x+118,y+70,370,26,17,C.muted);});footer(s,10); }
  { const s = add(); title(s, 'The result is a practical foundation for digital hospital management', 'City Hospital centralizes patient access, clinical scheduling, records and billing in one web platform.');
    text(s,'What the system delivers',72,210,400,32,27,C.navy,true); bullet(s,'Connected workflows','Patient, doctor and administrator tasks use the same reliable database.',72,266,520); bullet(s,'Operational visibility','Appointments, prescriptions and billing are tracked through dedicated modules.',72,366,520); bullet(s,'Ready to extend','Future work can add stronger authentication, notifications, reports and online payments.',72,466,520);
    shape(s,'roundRect',730,220,400,244,C.sky,C.line);text(s,'Thank you',770,270,320,48,38,C.navy,true,'center');text(s,'Questions & discussion',770,342,320,30,21,C.muted,false,'center');text(s,'Hospital Management System',770,404,320,24,16,C.teal,true,'center');footer(s,11); }

  for (const [i, slide] of p.slides.items.entries()) await saveBlob(`${BUILD}/slide-${String(i+1).padStart(2,'0')}.png`, await p.export({ slide, format:'png', scale:1 }));
  await saveBlob(`${BUILD}/montage.webp`, await p.export({ format:'webp', montage:true, scale:1 }));
  const out = await PresentationFile.exportPptx(p); await out.save(OUT);
}
main().catch(e => { console.error(e); process.exitCode=1; });
