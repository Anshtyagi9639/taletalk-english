import type { MetadataRoute } from "next";

/** Web app manifest: lets me "Add to Home Screen" and open TaleTalk like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaleTalk – Learn English with stories",
    short_name: "TaleTalk",
    description: "Read and listen to stories, talk with Alex, and practise everyday English.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f7f4",
    theme_color: "#4f46e5",
    categories: ["education", "books"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/" },
      { name: "Talk with Alex", url: "/talk" },
      { name: "Library", url: "/library" },
    ],
  };
}
