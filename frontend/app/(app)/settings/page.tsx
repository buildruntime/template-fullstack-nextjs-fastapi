import type { Metadata } from "next";
import { Panel, PageHeader } from "@/components/shell/page-header";
import { listMySessions, requireUser } from "@/lib/dal";
import { PasswordForm, ProfileForm } from "./forms";
import { SessionList } from "./session-list";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, sessions] = await Promise.all([requireUser(), listMySessions()]);

  return (
    <>
      <PageHeader eyebrow="Settings" title="Your account" />
      <div className="grid gap-5">
        <Panel id="profile" title="Profile" description="Your name as other people see it.">
          <ProfileForm name={user.name} email={user.email} />
        </Panel>
        <Panel
          id="password"
          title="Password"
          description="Changing your password signs out every other session."
        >
          <PasswordForm />
        </Panel>
        <Panel
          id="sessions"
          title="Sessions"
          description="Everywhere you are signed in. Sign out of any device you do not recognise."
        >
          <SessionList sessions={sessions} />
        </Panel>
      </div>
    </>
  );
}
