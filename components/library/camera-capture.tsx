"use client";

import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

/** True when this browser can show a live camera (needs https or localhost). */
export function canUseLiveCamera() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/**
 * Live camera with a book-shaped frame guide. "Take photo" gives a File (JPEG).
 * If the camera cannot start, `onFail` is called so the page can use the phone's camera app instead.
 */
export function CameraCapture({
  open,
  onOpenChange,
  onPhoto,
  onFail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhoto: (file: File) => void;
  onFail: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        onOpenChange(false);
        onFail();
      }
    })();
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
    };
  }, [open, onFail, onOpenChange]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onOpenChange(false);
        onPhoto(new File([blob], "cover.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Photo of a book"
      description="Put the book cover inside the frame."
      footer={
        <Button size="lg" className="w-full" onClick={capture} disabled={!ready}>
          {ready ? <Camera /> : <Loader2 className="animate-spin" />} {ready ? "Take photo" : "Starting the camera…"}
        </Button>
      }
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="size-full object-cover" aria-label="Camera" />
        {/* Frame guide: a 2:3 book shape; the rest is darker. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="aspect-[2/3] w-[62%] rounded-xl border-[3px] border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]" />
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white drop-shadow">Hold still · good light helps</p>
      </div>
    </Sheet>
  );
}
