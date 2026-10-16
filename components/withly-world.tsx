"use client";

import { useState } from "react";
import { BookOpen, Coffee, Headphones, Plus } from "lucide-react";

import styles from "@/app/landing.module.css";

const activities = [
  { id: "focus", label: "Focus", icon: Headphones, title: "Different goals. Same table.", description: "Headphones on. A little accountability nearby.", note: "Bring your laptop. Find your flow." },
  { id: "coffee", label: "Coffee", icon: Coffee, title: "A coffee break, with company.", description: "Meet in a public café. Start with a simple hello.", note: "One small plan. Someone new." },
  { id: "study", label: "Study", icon: BookOpen, title: "Your own chapter. A shared pause.", description: "Bring a book or your notes. Settle into a study session.", note: "Quiet company counts, too." },
] as const;

/** A visual activity preview, not a matching result or a live session. */
export function WithlyWorld() {
  const [selected, setSelected] = useState<(typeof activities)[number]>(activities[0]);
  return (
    <div className={styles.world}>
      <div className={styles.worldHeader}><span className={styles.pairMark} aria-hidden="true" /><span>A LITTLE SPACE FOR TWO</span><span className={styles.worldLabel}>ACTIVITY PREVIEW</span></div>
      <div className={styles.modeSwitch} role="group" aria-label="Preview an activity">
        {activities.map((activity) => <button key={activity.id} type="button" aria-pressed={selected.id === activity.id} onClick={() => setSelected(activity)}><activity.icon size={16} />{activity.label}</button>)}
      </div>
      <div className={styles.tableScene} data-activity={selected.id}>
        <svg viewBox="0 0 500 370" aria-hidden="true" className={styles.tableDrawing}>
          <circle cx="183" cy="175" r="143" fill="#e5ddff" />
          <circle cx="317" cy="175" r="143" fill="#e4f4c6" fillOpacity=".8" />
          <circle cx="250" cy="178" r="154" fill="none" stroke="#cec6e7" strokeDasharray="3 9" />
          <path d="M203 76h94a60 60 0 0 1 60 60v92a60 60 0 0 1-60 60h-94a60 60 0 0 1-60-60v-92a60 60 0 0 1 60-60" fill="#d7d5e7" />
          <rect x="143" y="66" width="214" height="212" rx="60" fill="white" stroke="#eeedf5" strokeWidth="2" />
          <path d="M250 84v176" stroke="#e4e1ee" strokeDasharray="4 7" />
          {/* Two people around the same table. */}
          <rect x="65" y="138" width="61" height="79" rx="27" fill="#bea9f1" />
          <rect x="375" y="138" width="61" height="79" rx="27" fill="#b2d884" />
          <circle cx="106" cy="175" r="39" fill="#7048e8" />
          <path d="M79 180q27-35 54 0v10q-27 27-54 0" fill="#5530be" />
          <circle cx="110" cy="162" r="21" fill="#eadcff" />
          <path d="M90 159q-4-28 24-23 17 3 17 21-12-1-16-11-10 12-25 13" fill="#32234f" />
          <circle cx="108" cy="162" r="2" fill="#32234f" /><circle cx="121" cy="162" r="2" fill="#32234f" />
          <path d="M112 171q4 3 7-1" fill="none" stroke="#32234f" strokeWidth="2" strokeLinecap="round" />
          <circle cx="394" cy="175" r="39" fill="#ccec94" />
          <path d="M367 183q27-35 54 0v9q-27 24-54 0" fill="#93bd59" />
          <circle cx="390" cy="162" r="21" fill="#785644" />
          <path d="M369 157q-2-29 23-25 21 2 20 27-15-1-20-12-7 10-23 10" fill="#2f2939" />
          <circle cx="380" cy="162" r="2" fill="#fff" /><circle cx="393" cy="162" r="2" fill="#fff" />
          <path d="M382 171q4 3 8 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          {selected.id === "focus" ? <g>
            <rect x="160" y="139" width="59" height="45" rx="5" fill="#ddd3fb" stroke="#b6a2e2" strokeWidth="2" />
            <rect x="166" y="145" width="47" height="32" rx="2" fill="#7855ce" /><path d="M157 188h66" stroke="#b6a2e2" strokeWidth="5" strokeLinecap="round" />
            <rect x="282" y="139" width="59" height="45" rx="5" fill="#dce9fc" stroke="#b0c8e9" strokeWidth="2" />
            <rect x="288" y="145" width="47" height="32" rx="2" fill="#6d92c8" /><path d="M279 188h66" stroke="#b0c8e9" strokeWidth="5" strokeLinecap="round" />
          </g> : selected.id === "study" ? <g>
            <path d="M162 143q16-8 31 0 15-8 30 0v43q-15-8-30 0-15-8-31 0z" fill="#d9cff8" stroke="#ad96df" strokeWidth="2" />
            <path d="M193 143v43M171 153h13m-13 8h13m19-8h12m-12 8h12" stroke="#9e83d3" strokeWidth="2" />
            <rect x="283" y="140" width="52" height="50" rx="5" fill="#c8dcfa" /><path d="M291 141v48m9-36h25m-25 9h25m-25 9h18" stroke="#86aada" strokeWidth="2" />
          </g> : <g>
            <circle cx="191" cy="165" r="27" fill="#ebe5fa" /><circle cx="307" cy="165" r="27" fill="#e5efff" />
            <path d="M211 159q18-1 10 13h-10M327 159q18-1 10 13h-10" fill="none" stroke="#bca6e7" strokeWidth="5" />
            <circle cx="191" cy="165" r="18" fill="#bca6e7" /><circle cx="307" cy="165" r="18" fill="#a7c6f2" />
            <circle cx="191" cy="165" r="12" fill="#695047" /><circle cx="307" cy="165" r="12" fill="#695047" />
          </g>}
          <circle cx="250" cy="233" r="16" fill="#e2efcc" /><path d="M250 244v-25m0 13q-15 0-13-12 13 0 13 12m0-3q13-1 11-12-11 2-11 12" fill="#6f9a56" stroke="#6f9a56" strokeWidth="2" />
          <rect x="76" y="225" width="58" height="25" rx="12.5" fill="white" /><text x="105" y="242" textAnchor="middle" fontSize="10" fontWeight="800" fill="#6040bd">YOU</text>
          <rect x="356" y="225" width="77" height="25" rx="12.5" fill="white" /><text x="394" y="242" textAnchor="middle" fontSize="10" fontWeight="800" fill="#4c6a2f">YOUR +1</text>
          <path d="M100 287q50 46 108 28m84 0q58 18 108-28" fill="none" stroke="#a393cc" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className={styles.sharedMoment}><span className={styles.pairMark} aria-hidden="true" />Same place. Your own pace.</div>
      </div>
      <div className={styles.worldCaption} role="status" aria-live="polite" aria-atomic="true"><div><h2>{selected.title}</h2><p>{selected.description}</p></div><span className={styles.plusBadge} aria-hidden="true"><Plus size={22} /></span></div>
      <p className={styles.worldFootnote}>{selected.note}</p>
    </div>
  );
}
