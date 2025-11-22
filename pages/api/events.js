import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const eventsDir = path.join(process.cwd(), "public", "events");

  try {
    const files = fs
      .readdirSync(eventsDir)
      .filter((f) => /\.(jpg|jpeg|png|mp4|webm)$/i.test(f));

    const urls = files.map((name) => `/events/${name}`);

    res.status(200).json({ files: urls });
  } catch (err) {
    res.status(500).json({ error: "Cannot read events folder", details: err });
  }
}
