import dynamic from "next/dynamic";

const UserProfilePlasmic = dynamic(
  () => import("../../components/UserProfilePlasmic"),
  {
    ssr: false, // 💥 kein SSR, nur im Browser
  }
);

export default function UserProfilePageRoute() {
  return <UserProfilePlasmic />;
}