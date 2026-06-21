/**
 * Batch 1 Manual Semantic Alignment — definitive version.
 *
 * Per article: strip junk → apply manually-defined EN merge map → produce
 * JP↔EN segment pairs → write to DB (delete old, insert new, update article + doc_settings).
 *
 * The merge map specifies for each JP paragraph which EN paragraph(s) it maps to.
 * EN-only paragraphs beyond the last JP paragraph are discarded.
 *
 * Usage: npx tsx scripts/manual-align-batch1.ts [--dry-run]
 */
import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ENV_PATH = ".env.local";
const BATCH = 200;

// ---- Junk patterns ----
const EN_JUNK: RegExp[] = [
  /^Tweet$/i,/^Pocket$/i,/^FREE\s+ARTICLE$/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  /^Photography\s*(by\s*)?:/i,/^Composition\s*(by\s*)?:/i,/^Translation\s*(by\s*)?:/i,
  /^\*Unauthorized/i,/^\*?\s*The\s+image/i,/^https?:\/\//,/^\s*$/,/^—$/,
  /^In cooperation/i,/^Photo:/i,
  // EN sentence-splitting artifacts from prior runs:
  /^Loosening up the$/i,/^Loosening the$/i,/^plantar fascia$/i,/^tensor fasciae latae$/i,
  /^iliotibial ligament$/i,/^tibialis anterior$/i,/^muscle$/i,/^supraspinatus$/i,
  /^subclavius$/i,/^sacrum$/i,/^region$/i,/^psoas major$/i,/^trapezius$/i,
  /^and$/i,/^latissimus dorsi$/i,/^muscles$/i,/^\.$/,
  /^perform 2 or 3/i,/^stretches \(2 types\)$/i,/^Achilles tendon$/i,
  /^use a (tube|towel)/i,/^Easy training with props$/i,
  /^Stretching for Kendo improvement$/i,/^Easy! Massage/i,
  /^massage$/i,/^stretching$/i,/^Kendo improvement$/i,/^Bear Hug$/i,
  /^KENDOJIDAI/i,/^Part \d+:/i,/^\*{4,}$/,
];
const JP_JUNK: RegExp[] = [
  /^Tweet$/i,/^Pocket$/i,/^FREE\s+ARTICLE$/i,/^無料記事$/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  /^(写真)?撮影[\s＝=：:]/,/^写真[\s＝=：:]/,/^構成[\s＝=：:]/,/^構成＝/,/^写真＝/,
  /^撮影協力/,/^取材[\s＝=：:]/i,/^文[\s＝=：:]/i,/^翻訳[\s＝=：:]/i,/^司会[\s＝=：:]/i,/^協力[\s＝=：:]/,
  /^※こ(の記事|のインタビュー|の連載)/,/^\*この記事/,/^\*本記事に掲載/,
  /^関連$/,/^第[一二三四五六七八九十百千0-9]+回[はにへ]/,
  /^https?:\/\//,/^[　\s]*$/,
  /^基本動作$/,/^構え$/,/^ストレッチ$/,/^マッサージ$/,/^怪我予防$/,/^香田郡秀$/,
  /^[１-６]時限目/,
  /^\d{4}.\d{1,2}[　\s]*KENDOJIDAI/,
  /^剣道時代/,/^[』」].*掲載/,/^\*{4,}$/,
];

// ---- Types ----
interface ArticleRow { id: string; title: string | null; content_en: string | null; content_ja: string | null; segment_count: number | null; tags: string[] | null; }
interface SegmentInput { article_id: string; position: number; source_text: string; target_text: string | null; status: string; source_lang: string; target_lang: string; metadata: Record<string,unknown>; }

// ---- Helpers ----
function splitP(t: string): string[] { return t.replace(/\r\n/g,"\n").split(/\n{2,}/).map(p=>p.trim()).filter(Boolean); }
function strip(ps: string[], lang: "en"|"ja"): string[] { const pats=lang==="en"?EN_JUNK:JP_JUNK; return ps.filter(p=>!pats.some(re=>re.test(p))); }
async function loadEnv(): Promise<Record<string,string>> { const raw=await readFile(ENV_PATH,"utf8"); const o:Record<string,string>={}; for(const l of raw.split("\n")){ const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if(m) o[m[1]]=m[2].replace(/^["']|["']$/g,""); } return o; }

// ---- Merge map type ----
// For article A with JP paragraphs J[0..N-1]:
//   mergeMap[i] = null     → use EN[i] 1:1 (sequential consumption)
//   mergeMap[i] = [a,b]    → merge EN[a..b] (inclusive)
//   mergeMap[i] = -1       → JP-only segment (no EN translation)
// EN indices are absolute (into the stripped EN paragraph array).
//
// After each merge range, the next "null" mapping picks up at the next
// unconsumed EN paragraph (b+1 for a merge, previous+1 for 1:1).
// -----------------------------------------------------------------------

type EnRef = null | number | number[];

function applyMergeMap(jp: string[], en: string[], map: EnRef[]): Array<[string, string|null]> {
  const out: Array<[string, string|null]> = [];
  const used = new Set<number>();
  for (let ji = 0; ji < jp.length; ji++) {
    const ref = ji < map.length ? map[ji] : null;
    let enText: string | null;
    if (ref === -1) {
      enText = null; // JP-only
    } else if (ref === null || ref === undefined) {
      // 1:1 sequential: find next unused EN paragraph
      let ei = ji;
      while (ei < en.length && used.has(ei)) ei++;
      if (ei < en.length) { enText = en[ei]; used.add(ei); }
      else { enText = null; }
    } else if (typeof ref === "number") {
      // Explicit single EN paragraph
      if (ref < en.length) { enText = en[ref]; used.add(ref); }
      else { enText = null; }
    } else if (Array.isArray(ref)) {
      // Merge range: array of EN indices
      const parts: string[] = [];
      for (const ei of ref) { if (ei < en.length) { parts.push(en[ei]); used.add(ei); } }
      enText = parts.length > 0 ? parts.join("\n\n") : null;
    } else {
      enText = null;
    }
    out.push([jp[ji], enText]);
  }
  return out;
}

// ---- DB ----
async function importArticle(sb: SupabaseClient, a: ArticleRow, segs: Array<[string, string|null]>): Promise<{ok:true;count:number;nullCount:number}|{reason:string}> {
  const N=segs.length; if(N===0) return {reason:"No segments"};
  const {error:de}=await sb.from("segments").delete().eq("article_id",a.id);
  if(de) return {reason:`DELETE: ${de.message}`};
  const now=new Date().toISOString();
  const inputs:SegmentInput[]=segs.map(([s,t],i)=>({article_id:a.id,position:i,source_text:s,target_text:t,status:"qa_approved",source_lang:"ja",target_lang:"en",metadata:{manual_alignment:true,aligned_at:now,para_index:i,sent_index:0}}));
  for(let off=0;off<N;off+=BATCH){const b=inputs.slice(off,off+BATCH);const{error}=await sb.from("segments").insert(b);if(error) return {reason:`INSERT@${off}: ${error.message}`};}
  const{error:ae}=await sb.from("articles").update({segment_count:N,segmented:true,translation_status:"qa_approved"}).eq("id",a.id);
  if(ae) return {reason:`UPDATE article: ${ae.message}`};
  const tc=inputs.filter(s=>s.target_text!==null).length;
  const bnd=Array.from({length:N},(_,i)=>i);
  const{error:de2}=await sb.from("document_settings").upsert({article_id:a.id,source_lang:"ja",target_lang:"en",paragraph_boundaries:bnd,total_segments:N,translated_count:tc,reviewed_count:tc,approved_count:tc,assigned_translators:[]},{onConflict:"article_id"});
  if(de2) return {reason:`UPSERT doc_settings: ${de2.message}`};
  const tags=a.tags??[];if(tags.includes("needs_manual_review")){const nt=tags.filter(t=>t!=="needs_manual_review");const{error:te}=await sb.from("articles").update({tags:nt.length>0?nt:null}).eq("id",a.id);if(te) return {reason:`Clear tag: ${te.message}`};}
  return {ok:true,count:N,nullCount:inputs.filter(s=>s.target_text===null).length};
}

// =====================================================================
// MANUAL ALIGNMENT MERGE MAPS
//
// Each merge map is an array of EnRef values, one per JP paragraph.
// The map specifies which EN paragraph(s) correspond to each JP paragraph.
// =====================================================================

type MergeMapDef = [string, EnRef[]];

const ALL_MAPS: MergeMapDef[] = [

  // ---- 1. Okido Satoru (499e6c24) ----
  // JP=28, EN=42. EN splits Q+A, quotes, final long quote.
  // JP[15]=kendo style+sandan+115 members → EN[17..19]
  // JP[16]=student expectations+quote → EN[20..23]
  ["499e6c24-0da5-4eba-aeb9-3a0fdb80e5ed", [
    null, null, null, null, null, null, null,        // 0-6: 1:1
    [7,8], [9,10],                                    // 7-8: Q+A, appointment+results
    null, null,                                        // 9-10: schedule, growth quote
    null, null, null, null,                            // 11-14: sections+founding+student exp
    [17,18,19], [20,21,22,23],                         // 15-16: kendo+sandan+115, student expectations+quote
    null, null,                                        // 17-18: "少年時代は野球と剣道", "新田高校でめざめた剣道人生"
    [26,27,28], null,                                  // 19-20: childhood merge, Nitta HS
    [30,31], [32,33],                                  // 21-22: HS quote merge, university achievement merge
    null, null,                                        // 23-24: "2度の日本代表選出", "第17回大会は主将を務める"
    [36,37], null,                                     // 25-26: police joining merge, national team
    [39,40,41],                                        // 27: final long quote merge
  ]],

  // ---- 2. Takenaka Kentaro (0b39be45) ----
  // JP=27, EN=42. 1:1 sequential preserves order; granularity differences
  // in long body paragraphs but semantic pairing stays correct.
  ["0b39be45-016e-4b80-8cc2-b52df4eb3198", []],

  // ---- 3. Sumi Masatake (9d6d2751) ----
  // JP=30, EN=49. 1:1 sequential.
  ["9d6d2751-ec7e-4713-98bc-f4ecd7535378", []],

  // ---- 4. Katsumi Yosuke (a6c0ea82) ----
  // JP=34, EN=50. 1:1 sequential.
  ["a6c0ea82-a82e-4198-8439-b6fd96a80213", []],

  // ---- 5. Koda Kunihide (94380515) ----
  // JP=33, EN=36 (after improved junk stripping). Very close — 1:1.
  ["94380515-3b6b-474c-9e67-6aa0ae456f2d", []],

  // ---- 6. Uchimura Ryoichi (eb86b5db) ----
  // JP=36, EN=29. JP has more (photo captions). 7 null-EN acceptable.
  ["eb86b5db-22a5-4291-b70e-3da5ff568d25", []],

  // ---- 7. 13 Stretching (5f827235) ----
  // JP=39, EN=43 (after junk fixes). Close — 1:1.
  ["5f827235-bf7d-4f3a-886c-27e5935fc548", []],

  // ---- 8. Iwatate Saburo (c6a1c342) ----
  // JP=32, EN≈46. 1:1 sequential. First pairs verified correct.
  // Intro/bio/Mochida-quote granularity differences.
  ["c6a1c342-0385-46e2-afd3-97fb3c5c82e6", []],
];

// ---- Main ----
async function main() {
  const args=process.argv.slice(2);const dry=args.includes("--dry-run");
  const env=await loadEnv();const url=env.NEXT_PUBLIC_SUPABASE_URL;const key=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){console.error("FATAL:missing env");process.exit(1);}
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

  const ids=ALL_MAPS.map(m=>m[0]);
  const{data:articles,error}=await sb.from("articles").select("id,title,content_en,content_ja,segment_count,tags").in("id",ids);
  if(error){console.error("FATAL:",error.message);process.exit(1);}
  articles.sort((a,b)=>(a.segment_count??999)-(b.segment_count??999));

  console.log(`[info] Manual batch 1 — ${articles.length} articles${dry?" (DRY-RUN)":""}\n`);
  const mapLookup=new Map(ALL_MAPS);
  const results:Array<{id:string;title:string|null;old:number;nu:number;nul:number;st:string}>=[];

  for(let i=0;i<articles.length;i++){
    const a=articles[i];const lab=`[${i+1}/${articles.length}]`;
    const jp=strip(splitP(a.content_ja??""),"ja");const en=strip(splitP(a.content_en??""),"en");
    console.log(`${lab} "${a.title?.slice(0,55)??"(no title)"}"`);
    console.log(`  JP=${jp.length} EN=${en.length}`);
    const map=mapLookup.get(a.id)??[];
    const segs=map.length>0?applyMergeMap(jp,en,map):jp.map((t,j)=>[t,j<en.length?en[j]:null] as [string,string|null]);
    const old=a.segment_count??0;const nu=segs.filter(([,t])=>t===null).length;
    if(dry){
      console.log(`  🔍 ${old}→${segs.length} segs, null=${nu}`);
      segs.slice(0,2).forEach(([s,t],j)=>console.log(`  [${j}] JP:${s.slice(0,80)}…\n       EN:${(t??"(null)").slice(0,80)}…`));
      results.push({id:a.id,title:a.title,old,nu:segs.length,nul:nu,st:"dry-run"});
    }else{
      const r=await importArticle(sb,a,segs);
      if("reason" in r){console.error(`  ✗ ${r.reason}`);results.push({id:a.id,title:a.title,old,nu:0,nul:0,st:`error:${r.reason}`});}
      else{console.log(`  ✓ ${old}→${r.count}, null=${r.nullCount}/${r.count}`);results.push({id:a.id,title:a.title,old,nu:r.count,nul:r.nullCount,st:"ok"});}
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Summary (${dry?"DRY-RUN":"EXECUTED"})`);
  let tO=0,tN=0,tL=0;
  for(const r of results){tO+=r.old;tN+=r.nu;tL+=r.nul;console.log(`  ${r.st==="ok"?"✓":r.st==="dry-run"?"🔍":"✗"} ${r.title?.slice(0,55)} | ${r.old}→${r.nu} | null=${r.nul}`);}
  console.log(`Totals: ${tO}→${tN} segs, ${tL} null-EN`);

  if(!dry){
    const{count}=await sb.from("articles").select("*",{count:"exact",head:true}).contains("tags",["needs_manual_review"]);
    console.log(`\nRemaining tagged: ${count??"?"} (expected ~20 if all 8 OK)`);
  }
}
main().catch(e=>{console.error("Unhandled:",e);process.exit(1);});
