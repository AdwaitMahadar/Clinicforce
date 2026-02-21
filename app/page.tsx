import { redirect } from "next/navigation";
// Root "/" → redirect to home dashboard as per 06-UI-Design-System.md §2
export default function RootPage() {
  redirect("/home/dashboard");
}
