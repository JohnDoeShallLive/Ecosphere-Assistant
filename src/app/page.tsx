import { AppProvider } from "@/lib/appContext";
import { EchoSphereApp } from "@/components/EchoSphereApp";

export default function Home() {
  return (
    <AppProvider>
      <EchoSphereApp />
    </AppProvider>
  );
}
