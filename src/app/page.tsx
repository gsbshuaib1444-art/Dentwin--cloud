'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Patient = {
  id: string; study_id: string; age: string|null; nickname: string|null; dentition: string|null;
  visit_date: string|null;medical_history?:string|null;dmft: number|null; DMFT: number|null; plaque: string|null; risk: string|null;
  findings: string|null; explanation: string|null; brushing: string|null; fluoride: string|null; frankl_behavior?:string|null; pain_score?:number|null; pain_scale?:string|null; pain_face?:number|null; treatment_plan?:string[]|null; treatment_items?:{treatment:string;tooth:string}[]|null; iopa_photo?:string|null; opg_photo?:string|null; radiographic_findings?:string|null; radiographic_interpretation?:string|null; explanation_tamil?:string|null;
  sugar: string|null; supervision: string|null; action1: string|null; action2: string|null;
  action3: string|null; recall: string|null; department: string|null; photos: Record<string,string>;
};
const blank = () => ({study_id:'',age:'',nickname:'',dentition:'Mixed',visit_date:new Date().toISOString().slice(0,10),medical_history:'',dmft:'',DMFT:'',plaque:'Not recorded',risk:'Not assessed',findings:'',explanation:'',frankl_behavior:'Not assessed',pain_score:0,pain_scale:'Wong-Baker FACES',pain_face:0,treatment_plan:[],treatment_items:[],iopa_photo:'',opg_photo:'',radiographic_findings:'',radiographic_interpretation:'',explanation_tamil:'',brushing:'Not recorded',fluoride:'Not recorded',sugar:'Not recorded',supervision:'Not recorded',action1:'',action2:'',action3:'',recall:'',department:'Paedodontics'});
const photoSlots = [{key:'front',label:'Front view'},{key:'upper',label:'Upper teeth'},{key:'lower',label:'Lower teeth'},{key:'closeup',label:'Finding close-up'},{key:'iopa_photo',label:'IOPA'},{key:'opg_photo',label:'OPG'}];

export default function Home() {
 const [session,setSession]=useState<any>(null),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [mode,setMode]=useState<'login'|'signup'>('login'),[patients,setPatients]=useState<Patient[]>([]);
 const [selected,setSelected]=useState<Patient|null>(null),[form,setForm]=useState<any>(blank()),[search,setSearch]=useState('');
 const [uploads,setUploads]=useState<Record<string,File|null>>({}),[previews,setPreviews]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const configured=!!supabase;
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(session)loadPatients()},[session]);
 useEffect(()=>{if(!selected||!supabase)return;let alive=true;(async()=>{const out:Record<string,string>={};for(const [k,v] of Object.entries(selected.photos||{})){const {data}=await supabase.storage.from('patient-photos').createSignedUrl(v,3600);if(data?.signedUrl)out[k]=data.signedUrl;}if(alive)setPreviews(out)})();return()=>{alive=false}},[selected]);
 async function loadPatients(){if(!supabase)return;const {data,error}=await supabase.from('patients').select('*').order('created_at',{ascending:false});if(error){setMessage(error.message);return}setPatients((data||[]) as Patient[]);if(selected){const fresh=(data||[]).find((p:any)=>p.id===selected.id);if(fresh)setSelected(fresh)}}
 async function auth(){if(!supabase)return;setBusy(true);setMessage('');const result=mode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(result.error)setMessage(result.error.message);else if(mode==='signup'&&!result.data.session)setMessage('Check your email to confirm your account, then sign in.')}
 async function logout(){await supabase?.auth.signOut();setSession(null);setPatients([]);setSelected(null)}
 function startNew(){setSelected(null);setForm(blank());setUploads({});setPreviews({});setMessage('New patient record. Use a coded study ID, not a name.')}
 function edit(p:Patient){
  setSelected(p);
  setForm({
    ...p,
    dmft:p.dmft??'',
    DMFT:p.DMFT??'',
    medical_history:p.medical_history??'',
    treatment_plan:p.treatment_plan??[],
    treatment_items:p.treatment_items??[]
  });
  setUploads({});
  setPreviews({});
  setMessage('Editing '+p.study_id);
}
 async function save(){
  if(!supabase||!form.study_id?.trim())return setMessage('Study ID is required.');
  setBusy(true);setMessage('');
  const photos={...(selected?.photos||{})};
  for(const [slot,file] of Object.entries(uploads)){if(!file)continue;
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${session.user.id}/${form.study_id}/${slot}-${Date.now()}-${safe}`;
    const {error:upErr}=await supabase.storage.from('patient-photos').upload(path,file,{upsert:false,contentType:file.type});
    if(upErr){setBusy(false);return setMessage('Photo upload failed: '+upErr.message)}
    photos[slot]=path; if(slot==='iopa_photo')form.iopa_photo=path; if(slot==='opg_photo')form.opg_photo=path;
  }
  const payload={study_id:form.study_id.trim(),medical_history:form.medical_history||null,frankl_behavior:form.frankl_behavior||null,pain_score:Number(form.pain_score||0),pain_scale:form.pain_scale||'Wong-Baker FACES',pain_face:Number(form.pain_face||0),treatment_plan:form.treatment_plan||[],treatment_items:form.treatment_items||[],iopa_photo:form.iopa_photo||null,opg_photo:form.opg_photo||null,radiographic_findings:form.radiographic_findings||null,radiographic_interpretation:form.radiographic_interpretation||null,explanation_tamil:form.explanation_tamil||null,age:form.age||null,nickname:form.nickname||null,dentition:form.dentition||null,visit_date:form.visit_date||null,dmft:form.dmft===''?null:Number(form.dmft),DMFT:form.DMFT===''?null:Number(form.DMFT),plaque:form.plaque,risk:form.risk,findings:form.findings,explanation:form.explanation,brushing:form.brushing,fluoride:form.fluoride,sugar:form.sugar,supervision:form.supervision,action1:form.action1,action2:form.action2,action3:form.action3,recall:form.recall,department:form.department,photos};
  const result=selected?await supabase.from('patients').update(payload).eq('id',selected.id).select().single():await supabase.from('patients').insert(payload).select().single();
  setBusy(false);if(result.error){setMessage(result.error.message.includes('DENTWIN_LIMIT_30')?'The shared workspace already has 30 patient records.':result.error.message);return}
  setMessage('Patient profile saved to the cloud.');await loadPatients();setSelected(result.data as Patient);
 }
 async function remove(p:Patient){if(!supabase||!confirm(`Delete patient ${p.study_id}? This cannot be undone.`))return;
   const paths=Object.values(p.photos||{}).filter(Boolean);if(paths.length)await supabase.storage.from('patient-photos').remove(paths);
   const {error}=await supabase.from('patients').delete().eq('id',p.id);if(error)setMessage(error.message);else{setMessage('Patient deleted.');setSelected(null);setForm(blank());await loadPatients()}}
 async function signed(path:string){if(!supabase)return '';const {data}=await supabase.storage.from('patient-photos').createSignedUrl(path,3600);return data?.signedUrl||''}
 async function printPoster(){if(!selected)return;const imgs:Record<string,string>={};for(const [k,v] of Object.entries(selected.photos||{}))imgs[k]=await signed(v);setPreviews(imgs);setTimeout(()=>window.print(),500)}
 const filtered=patients.filter(p=>p.study_id.toLowerCase().includes(search.toLowerCase())||(p.age||'').toLowerCase().includes(search.toLowerCase()));
 const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));
 if(!configured)return <main className="center"><h1>🦷 DENTWIN setup needed</h1><p>Add your Supabase project URL and anon key to the Vercel environment variables.</p><p>See <b>DEPLOYMENT.md</b> in the project package.</p></main>;
 if(!session)return <main className="auth"><div className="authcard"><div className="mascot">🦷🐻</div><h1>DENTWIN</h1><p>My Bright Smile · Secure sign in</p><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/><button disabled={busy} onClick={auth}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button><p className="switch" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Need an account? Create one':'Already registered? Sign in'}</p>{message&&<p className="message">{message}</p>}</div></main>;
 return <main>
 <header className="apphead"><div><div className="logo">🦷</div><h1>DENTWIN</h1><p>My Bright Smile · Paediatric patient education</p></div><div className="headright"><span>{patients.length} / 30 shared profiles</span><button className="light" onClick={logout}>Sign out</button></div></header>
 <div className="columns">
 <aside className="sidebar no-print">
  <div className="bar"><h2>Patient records</h2><button onClick={startNew}>＋ New</button></div>
  <input placeholder="Search study ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
  <div className="patientlist">{filtered.map(p=><button className={'patientitem '+(selected?.id===p.id?'chosen':'')} key={p.id} onClick={()=>edit(p)}><b>{p.study_id}</b><small>{p.age||'Age not entered'} · {p.risk||'Risk not assessed'}</small></button>)}</div>
  <p className="tiny">Shared team workspace · 15 staff accounts · 30 patient records total. All signed-in staff can view and update records.</p>
 </aside>
 <section className="editor no-print">
  <div className="bar"><h2>{selected?'Edit patient':'New patient'}</h2>{selected&&<button className="danger" onClick={()=>remove(selected)}>Delete</button>}</div>
  <div className="fields">
  {field('Study ID *','study_id','text','e.g. DW-001')}{field('Age','age','text','e.g. 7 years')}{field('Nickname (optional)','nickname','text','Little Star')}
  {selectField('Dentition','dentition',['Primary','Mixed','Permanent'])}{selectField('Frankl behaviour','frankl_behavior',['Not assessed','Definitely negative','Negative','Positive','Definitely positive'])}
  {selectField('Pain scale','pain_scale',['Wong-Baker FACES','FPS-R','Numeric Rating Scale (0–10)','FLACC'])}<label className="full painbox">Pain face scale · select the face matching the child’s pain<div className="faces">{['😃','🙂','😐','🙁','😣','😭'].map((f,i)=><button type="button" key={i} className={Number(form.pain_face??0)===i*2?'face chosenface':'face'} onClick={()=>{set('pain_face',i*2);set('pain_score',i*2)}}><span>{f}</span><b>{i*2}</b><small>{['No hurt','Hurts little','Hurts a little more','Hurts even more','Hurts whole lot','Hurts worst'][i]}</small></button>)}</div></label>{field('Pain score (0–10)','pain_score','number')}{field('Visit date','visit_date','date')}{selectField('Dentist-assessed risk','risk',['Not assessed','Low','Moderate','High'])}
  {field('dmft','dmft','number')}{field('DMFT','DMFT','number')}{selectField('Plaque / oral hygiene','plaque',['Not recorded','Good','Fair','Needs improvement'])}
  {selectField('Brushing','brushing',['Not recorded','Twice daily','Once daily','Less than daily'])}{selectField('Fluoride toothpaste','fluoride',['Not recorded','Yes','No','Not sure'])}{selectField('Sugary snacks','sugar',['Not recorded','Rarely','1 time/day','2 times/day','3+ times/day'])}
  {selectField('Parent supervision','supervision',['Not recorded','Always','Sometimes','Rarely'])}
  {textArea('Main dental findings','findings','Dentist-recorded findings…')}{textArea('Parent-friendly explanation','explanation','What did the dentist explain?')}{textArea('Parent explanation (Tamil)','explanation_tamil','பெற்றோருக்கான விளக்கம்')}{textArea('Medical History','medical_history','Enter relevant medical conditions, allergies, medications and previous medical history…')}{multiSelectField('Treatment plan','treatment_plan',['Oral prophylaxis','Fluoride varnish application','Pit and fissure sealant','Preventive resin restoration','GIC restoration','Composite restoration','Atraumatic restorative treatment (ART)','Pulpotomy','Pulpectomy','Stainless steel crown (SSC)','Extraction','Space maintainer','Habit counselling','Dietary counselling','Preventive advice','Review / recall','Referral','Other'])} {textArea('Radiographic findings','radiographic_findings','Dentist-recorded IOPA / OPG findings')}{textArea('Radiographic interpretation (dentist verified)','radiographic_interpretation','Clinician-reviewed explanation')}
  {field('Priority action 1','action1','text','e.g. Complete advised treatment')}{field('Priority action 2','action2','text','e.g. Brush twice daily with parent help')}{field('Priority action 3','action3','text','e.g. Reduce frequent sugary snacks')}{field('Recall','recall','text','e.g. 3 months')}{field('Department','department','text','Paedodontics')}
  </div>
  <h3 className="subhead"> Radiographs</h3><div className="uploadgrid">{['iopa_photo','opg_photo'].map(k=><label className="upload" key={k}>{k.toUpperCase()}<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f&&f.size<=5*1024*1024)setUploads(u=>({...u,[k]:f}));else if(f)setMessage('Choose image under 5 MB')}}/><small>{uploads[k]?.name||'Choose image'}</small></label>)}</div>
  <h3 className="subhead"> Intraoral photographs</h3><div className="uploadgrid">{photoSlots.map(s=><label className="upload" key={s.key}>{s.label}<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]||null;if(f&&f.size>5*1024*1024){setMessage('Choose images under 5 MB.');return}setUploads(u=>({...u,[s.key]:f}))}}/><small>{uploads[s.key]?.name|| (selected?.photos?.[s.key]?'Photo already saved':'Choose photo')}</small></label>)}</div>
  <button className="save" disabled={busy} onClick={save}>{busy?'Saving…':'Save patient to cloud'}</button>{message&&<p className="message">{message}</p>}
 </section>
 <section className="poster" id="poster">
  {!selected?<div className="empty"><div>🐻 🦷 🐰</div><h2>Choose a patient to view their education poster</h2><p>Save a new patient or select an existing record.</p></div>:<Poster patient={selected} previews={previews} onPrint={printPoster}/>}
 </section></div>
 </main>;
 function field(label:string,key:string,type='text',placeholder=''){return <label>{label}<input type={type} value={form[key]??''} placeholder={placeholder} onChange={e=>set(key,e.target.value)}/></label>}
 function selectField(label:string,key:string,opts:string[]){return <label>{label}<select value={form[key]??opts[0]} onChange={e=>set(key,e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select></label>}
function multiSelectField(label:string,key:string,opts:string[]){
  const items:( {treatment:string;tooth:string} )[] = form.treatment_items||[];
  const fdi=['11','12','13','14','15','16','17','18','21','22','23','24','25','26','27','28','31','32','33','34','35','36','37','38','41','42','43','44','45','46','47','48','51','52','53','54','55','61','62','63','64','65','71','72','73','74','75','81','82','83','84','85'];
  const add=(treatment:string)=>{if(!items.some(x=>x.treatment===treatment))set('treatment_items',[...items,{treatment,tooth:''}]);};
  const update=(i:number,tooth:string)=>set('treatment_items',items.map((x,n)=>n===i?{...x,tooth}:x));
  const remove=(i:number)=>set('treatment_items',items.filter((_,n)=>n!==i));
  return <div className="full treatment-picker">
    <label>{label}</label>
    <details><summary>＋ Add a treatment</summary><div className="treatment-options">{opts.map(o=><button type="button" key={o} className="treatment-option" onClick={()=>add(o)}>{items.some(x=>x.treatment===o)?'✓ ': '+ '}{o}</button>)}</div></details>
    {items.length===0?<small>Select each planned treatment, then assign its FDI tooth number.</small>:<div className="treatment-rows">{items.map((item,i)=><div className="treatment-row" key={item.treatment}><b>{item.treatment}</b><label>FDI tooth number<select value={item.tooth} onChange={e=>update(i,e.target.value)}><option value="">Select tooth</option>{fdi.map(n=><option key={n} value={n}>{n}</option>)}</select></label><button type="button" className="remove-treatment" onClick={()=>remove(i)} aria-label="Remove treatment">×</button></div>)}</div>}
    <small>FDI notation: permanent teeth 11–48; primary teeth 51–85.</small>
  </div>;
}
 
  function textArea(label:string,key:string,placeholder:string){return <label className="full">{label}<textarea value={form[key]??''} placeholder={placeholder} onChange={e=>set(key,e.target.value)}/></label>}
}
function Poster({patient:p,previews,onPrint}:{patient:Patient,previews:Record<string,string>,onPrint:()=>void}){
 const photos=photoSlots.filter(s=>p.photos?.[s.key]);
 const treatments=p.treatment_items||[];
 return <div className="smile-poster">
  <div className="posterhead"><div><span className="poster-kicker">MY DENTWIN SMILE REPORT</span><h2>Look at my <em>super smile{p.nickname?' · '+p.nickname:''}!</em></h2><p>A little report about my healthy teeth 🌈</p></div><span className="poster-mascots">🦷 🐻 ⭐ 🐰</span></div>
  <div className="star-banner">🌟 YOU ARE A SMILE STAR! 🌟</div>
  <div className="posterbody">
   <div className="stats"><div><small>🎂 MY AGE</small><b>{p.age||'—'}</b></div><div><small>🦷 MY TEETH</small><b>{p.dentition||'—'}</b></div><div><small>🔎 DENTAL CHECK</small><b>d {p.dmft??'—'} / D {p.DMFT??'—'}</b></div><div><small>🌈 SMILE RISK</small><b>{p.risk||'—'}</b></div></div>
   <article className="finding-panel"><h3>🔎 What did the dentist find?</h3><h4>My dental findings</h4><p>{p.findings||'No findings entered yet.'}</p><h4>What it means</h4><p>{p.explanation||'Your dentist will explain what was found and how to keep your teeth healthy.'}</p></article>
   <article className="habits-panel"><h3>🌱 My healthy smile habits</h3><ul><li><b>Brushing:</b> {p.brushing||'Not recorded'}</li><li><b>Fluoride toothpaste:</b> {p.fluoride||'Not recorded'}</li><li><b>Sugary snacks:</b> {p.sugar||'Not recorded'}</li><li><b>Grown-up help:</b> {p.supervision||'Not recorded'}</li></ul></article>
   {treatments.length>0&&<article className="treatment-panel"><h3>🦷 My dental treatment plan</h3>{treatments.map((t,i)=><p key={i}>• {t.treatment} — Tooth {t.tooth||'to be confirmed'}</p>)}</article>}
   <article className="photoarticle"><h3>📸 My teeth in pictures</h3><div className="photogrid">{photos.length?photos.map(s=><figure key={s.key}>{previews[s.key]?<img src={previews[s.key]} alt={s.label}/>:<div className="photoplace">Photo saved in cloud</div>}<figcaption>{s.label}</figcaption></figure>):<p>No photographs uploaded yet.</p>}</div></article>
   <article className="actionarticle"><h3>🦸 My super-smile mission!</h3><div className="actiongrid">{[p.action1,p.action2,p.action3].filter(Boolean).map((a,i)=><div key={i}><b>{['⭐ Mission 1','⭐ Mission 2','⭐ Mission 3'][i]}</b>{a}</div>)}</div><p className="remember">💧 Drink water, enjoy tooth-friendly snacks and brush every day. You can do it, Smile Star!</p></article>
   <div className="congrats-banner">🎉 Keep smiling — your smile is special! 💚</div>
   <footer>Study ID: {p.study_id} · Department: {p.department||'Paedodontics'} · Visit: {p.visit_date||'—'} · Next visit: {p.recall||'As advised'}</footer>
   <button className="no-print printbtn" onClick={onPrint}>Print / Save this child's poster as PDF</button>
  </div>
 </div>;
}
