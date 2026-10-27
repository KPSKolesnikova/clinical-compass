"use client";
import { useEffect, useState } from "react";
import { followUpStatus, type FollowUpPatient } from "../../lib/patient-insights";
export default function FollowUpBadge({patient}:{patient:FollowUpPatient}) {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[]);
  const status=followUpStatus(patient,now);
  return <details className="care-followup-details"><summary className={`care-status ${status.tone}`}><i aria-hidden="true"/>{status.title}</summary><p>{status.detail}</p></details>;
}
