"use client";

import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrigin } from "@/hooks/use-origin";
import { notify } from "./toast";

/** Deelnamelink + QR-code. In het prototype verwijst de link naar deze omgeving. */
export function InviteLink({ path, qr = true }: { path: string; qr?: boolean }) {
  const origin = useOrigin();
  const url = `${origin}${path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify.success("Link gekopieerd");
    } catch {
      notify.error("Kopiëren lukte niet", "Selecteer de link en kopieer hem handmatig.");
    }
  };
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {qr && origin && (
        <div className="w-fit rounded-xl bg-white p-3 ring-1 ring-km-line">
          <QRCodeSVG value={url} size={136} fgColor="#103e30" title="QR-code om deel te nemen aan de sessie" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor="deelnamelink" className="font-semibold text-km-green">
          Deelnamelink
        </Label>
        <div className="flex gap-2">
          <Input id="deelnamelink" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0" />
          <Button variant="outline" onClick={copy} className="shrink-0">
            <Copy aria-hidden />
            Kopieer
          </Button>
        </div>
        <p className="text-sm text-km-muted">Prototype: de link werkt alleen in deze omgeving en controleert nog geen toegang.</p>
      </div>
    </div>
  );
}
