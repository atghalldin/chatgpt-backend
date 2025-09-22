import type { VercelRequest,VercelResponse } from "@vercel/node";
import OpenAI from "openai";
const ALLOW_ORIGIN=process.env.ALLOW_ORIGIN||"*";
const SOURCE_ALLOWLIST=(process.env.SOURCE_ALLOWLIST||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
const SCOPE_KEYWORDS=(process.env.SCOPE_KEYWORDS||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
const SCOPE_REFUSAL=process.env.SCOPE_REFUSAL||"Frågan är utanför området.";
const SYSTEM_AREA=process.env.SYSTEM_AREA||"Du är expert inom området.";
function extractUrls(t:string){return(t.match(/https?:\/\/[^\s]+/gi)||[]).map(u=>u.trim());}
function hostnameOf(u:string){try{return new URL(u).hostname.toLowerCase();}catch{return null;}}
function isAllowedUrl(u:string){if(!SOURCE_ALLOWLIST.length)return true;const h=hostnameOf(u);return!!h&&SOURCE_ALLOWLIST.some(dom=>h==dom||h.endsWith("."+dom));}
function isInScope(t:string){if(!SCOPE_KEYWORDS.length)return true;const l=t.toLowerCase();return SCOPE_KEYWORDS.some(k=>l.includes(k));}
export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader("Access-Control-Allow-Origin",ALLOW_ORIGIN);
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const apiKey=process.env.OPENAI_API_KEY; if(!apiKey)return res.status(500).json({error:"Missing OPENAI_API_KEY"});
  const {message}=req.body||{}; if(!message)return res.status(400).json({error:"Missing message"});
  if(!isInScope(message))return res.json({reply:SCOPE_REFUSAL});
  const bad=extractUrls(message).filter(u=>!isAllowedUrl(u)); if(bad.length)return res.status(400).json({error:"Otillåtna länkar",details:bad});
  const client=new OpenAI({apiKey}); const resp=await client.responses.create({model:"gpt-4o-mini",input:[{role:"system",content:SYSTEM_AREA},{role:"user",content:message}]});
  // @ts-ignore
  const reply=resp.output_text||""; return res.json({reply}); }
