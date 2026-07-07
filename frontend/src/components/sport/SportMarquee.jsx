import { motion } from "framer-motion";

/**
 * Racing ticker – infinitely scrolling red band with brand words + kantone,
 * separated by inline checkered-flag icons. Purely decorative.
 */
export default function SportMarquee() {
  const items = [
    "Zürich",
    "Schwyz",
    "St. Gallen",
    "Graubünden",
    "11 Standorte",
    "VKU · Kategorie B",
    "Mental Coaching",
    "Anders · Besser · Mutiger",
  ];
  // Duplicate for seamless loop
  const track = [...items, ...items, ...items];

  return (
    <section
      data-testid="sport-marquee"
      className="relative bg-[#e11d48] text-black border-y border-black overflow-hidden"
    >
      <motion.div
        animate={{ x: ["0%", "-33.333%"] }}
        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
        className="flex items-center whitespace-nowrap py-4"
      >
        {track.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-8 font-race text-3xl md:text-4xl tracking-wider uppercase px-8"
          >
            {item}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="inline-block shrink-0"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="6" height="6" fill="#000" />
              <rect x="12" y="0" width="6" height="6" fill="#000" />
              <rect x="6" y="6" width="6" height="6" fill="#000" />
              <rect x="18" y="6" width="6" height="6" fill="#000" />
              <rect x="0" y="12" width="6" height="6" fill="#000" />
              <rect x="12" y="12" width="6" height="6" fill="#000" />
              <rect x="6" y="18" width="6" height="6" fill="#000" />
              <rect x="18" y="18" width="6" height="6" fill="#000" />
            </svg>
          </span>
        ))}
      </motion.div>
    </section>
  );
}
