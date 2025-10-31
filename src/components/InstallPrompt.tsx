import { usePWAInstallPrompt } from "@/hooks/usePWAInstallPrompt";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const { canInstall, promptInstall, isInstalled } = usePWAInstallPrompt();

  if (!canInstall || isInstalled) return null; // nichts anzeigen, wenn nicht installierbar

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
        <img
          src="/djk_logo.png"
          alt="DJK Logo"
          className="w-20 h-20 object-contain"
        />
        <h2 className="text-xl font-semibold text-gray-800">
          DJK App installieren
        </h2>
        <p className="text-sm text-gray-600">
          Installiere die App, um schnellen Zugriff auf alle Funktionen zu haben.
        </p>
        <Button
          className="bg-djk-green hover:bg-djk-green/90 text-white w-full"
          onClick={promptInstall}
        >
          Jetzt installieren
        </Button>
      </div>
    </div>
  );
}
