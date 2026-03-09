"use client";

import { useState, useTransition } from "react";
import { Radar } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateProfileAction } from "@/app/workspace/actions";
import type { WorkspaceProfile } from "@/lib/supabase/types";

export function ProfilePanel({
  profile,
  preview,
  onStatus,
}: {
  profile: WorkspaceProfile;
  preview: boolean;
  onStatus: (message: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: profile.displayName,
    aboutMe: profile.aboutMe,
    homeArea: profile.homeArea,
  });
  const [isPending, startTransition] = useTransition();

  return (
    <section className="panel profile-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Identity</p>
          <h3>{profile.displayName}</h3>
        </div>
        <span className="status-dot">
          <Radar size={16} />
          {profile.homeArea || "Area not set"}
        </span>
      </div>

      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const result = await updateProfileAction(form);
            onStatus(result.message);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <label>
          Display name
          <input
            type="text"
            value={form.displayName}
            onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
            minLength={2}
            maxLength={60}
            disabled={preview || isPending}
          />
        </label>

        <label>
          About you
          <textarea
            rows={3}
            value={form.aboutMe}
            onChange={(event) => setForm((current) => ({ ...current, aboutMe: event.target.value }))}
            maxLength={300}
            disabled={preview || isPending}
          />
        </label>

        <label>
          Home area
          <input
            type="text"
            value={form.homeArea}
            onChange={(event) => setForm((current) => ({ ...current, homeArea: event.target.value }))}
            maxLength={120}
            disabled={preview || isPending}
          />
        </label>

        <button className="secondary-button" type="submit" disabled={preview || isPending}>
          {preview ? "Preview mode only" : isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}

