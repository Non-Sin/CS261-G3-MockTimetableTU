import type { UserProfileResponse } from "../../users/types";
import AuthIcon from "./AuthIcon";

export default function UserNavbar({ profile }: { profile: UserProfileResponse | null }) {
  return (
    <div className="flex items-center gap-[13px] text-right max-[760px]:ml-auto" aria-label="ข้อมูลนักศึกษา">
      <div>
        {profile ? (
          <>
            <p className="font-bold">{profile.firstName} {profile.lastName}</p>
            <p className="text-[12px] text-[#687d9d]">{profile.studentId}</p>
          </>
        ) : <p className="text-[12px] text-[#687d9d]">กำลังโหลดข้อมูลนักศึกษา…</p>}
      </div>
      <span className="grid size-[42px] place-items-center rounded-full bg-[#fff0f1] text-[#cd1724]"><AuthIcon name="user" width={22} height={22} /></span>
    </div>
  );
}
