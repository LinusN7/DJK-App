import { useState } from "react";
import { usePWAInstallPrompt } from "@/hooks/usePWAInstallPrompt";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const { canInstall, promptInstall, isInstalled } = usePWAInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  // Nur anzeigen, wenn App installierbar ist, nicht installiert, und nicht abgelehnt wurde
  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
        {/* Logo */}
        <img
          src="/djk_logo.png"
          alt="DJK Logo"
          className="w-20 h-20 object-contain"
        />

        {/* Titel */}
        <h2 className="text-xl font-semibold text-gray-900">
          DJK App installieren
        </h2>

        {/* Beschreibung */}
        <p className="text-sm text-gray-600">
          Installiere die App auf deinem Gerät, um schnellen Zugriff auf alle
          Funktionen zu haben.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <Button
            className="bg-djk-green hover:bg-djk-green/90 text-white w-full"
            onClick={promptInstall}
          >
            App installieren
          </Button>

          <Button
            variant="outline"
            className="w-full text-gray-600 hover:text-gray-800"
            onClick={() => setDismissed(true)}
          >
            Nein, danke
          </Button>
        </div>
      </div>
    </div>
  );
}
