import { useEffect } from "react";
import { usePWAInstallPrompt } from "@/hooks/usePWAInstallPrompt";
import { Button } from "@/components/ui/button";

function InstallPrompt() {
  const { canInstall, promptInstall, isInstalled } = usePWAInstallPrompt();

  useEffect(() => {
    if (!canInstall || isInstalled) return;
    const timer = setTimeout(() => {
      const confirmed = window.confirm("Möchtest du die DJK App installieren?");
      if (confirmed) promptInstall();
    }, 3000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, promptInstall]);

  if (isInstalled) return null;

  return (
    <>
      {canInstall && (
        <div className="fixed bottom-20 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 flex flex-col items-center gap-2 z-50">
          <p className="text-sm text-center font-medium">DJK App installieren?</p>
          <Button
            className="bg-djk-green hover:bg-djk-green/90 text-white"
            size="sm"
            onClick={promptInstall}
          >
            Jetzt installieren
          </Button>
        </div>
      )}
    </>
  );
}

export default InstallPrompt;
