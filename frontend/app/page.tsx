"use client";

import AuthGuard from "@/features/auth/components/AuthGuard";
import InactivityTimer from "@/features/auth/components/InactivityTimer";
import UserNavbar from "@/features/auth/components/UserNavbar";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import Timetable from "@/features/timetable/Timetable";

const Page = () => {
  const { profile } = useCurrentUser();

  return (
    <AuthGuard>
      <InactivityTimer>
        <Timetable account={<UserNavbar profile={profile} />} />
      </InactivityTimer>
    </AuthGuard>
  );
};

export default Page;
