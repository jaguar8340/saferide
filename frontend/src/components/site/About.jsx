import { motion } from "framer-motion";
import { Sparkles, Camera } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";
import { useEdit } from "@/contexts/EditContext";
import CertificatesDialog from "@/components/site/CertificatesDialog";
import Speedo from "@/components/site/Speedo";

export default function About({ data }) {
  const { lang, pick, t } = useLang();
  const { editMode } = useEdit();
  if (!data) return null;

  const dogPhoto = data.dog_photo_url;
  const dogCaption = pick(data.dog_caption_de, data.dog_caption_en);
  const showDogSlot = editMode || dogPhoto;

  return (
    <section
      id="about"
      data-testid="about-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 order-2 lg:order-1"
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={14} className="text-[#ff5a36]" />
              <Editable
                path={`about.overline_${lang}`}
                value={pick(data.overline_de, data.overline_en)}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <Editable
              path={`about.title_${lang}`}
              value={pick(data.title_de, data.title_en)}
              as="h2"
              className="font-display leading-[0.98] tracking-tight text-[#0f172a]"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            />
            <Editable
              path={`about.body_${lang}`}
              value={pick(data.body_de, data.body_en)}
              as="p"
              multiline
              className="mt-7 text-lg text-[#475569] leading-relaxed font-medium max-w-xl block"
            />
            <div className="mt-6 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 text-sm font-semibold">
              <span className="dot-accent" />
              <Editable
                path={`about.trust_${lang}`}
                value={pick(data.trust_de, data.trust_en)}
                className="font-semibold"
              />
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch" data-testid="about-dog-block">
              <EditableImage
                path="about.dog_photo_url"
                src={data.dog_photo_url || "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1200&q=80"}
                alt="Pixie, Nadines tierische Begleiterin"
                className="block rounded-3xl overflow-hidden border border-[#e2e8f0] bg-white"
                imgClassName="w-full aspect-square object-cover"
              />
              <div
                data-testid="about-dog-caption"
                className="relative rounded-3xl bg-white border border-[#e2e8f0] p-6 md:p-7 flex flex-col justify-center shadow-[0_10px_28px_-16px_rgba(15,23,42,0.18)]"
              >
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.24em] uppercase text-[#ff5a36] mb-3">
                  <span className="dot-accent" />
                  <Editable
                    path={`about.dog_badge_${lang}`}
                    value={pick(data.dog_badge_de, data.dog_badge_en)}
                    className="inline"
                  />
                </span>
                <Editable
                  path={`about.dog_caption_${lang}`}
                  value={pick(data.dog_caption_de, data.dog_caption_en)}
                  as="p"
                  multiline
                  className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-[#0f172a] block"
                />
                <Editable
                  path={`about.dog_sub_${lang}`}
                  value={pick(data.dog_sub_de, data.dog_sub_en)}
                  as="p"
                  multiline
                  className="mt-3 text-sm md:text-base text-[#475569] leading-relaxed font-medium block"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 order-1 lg:order-2"
          >
            <div className="relative">
              <EditableImage
                path="about.image_url"
                src={data.image_url}
                alt="Nadine Stäubli"
                className="block rounded-3xl overflow-hidden"
                imgClassName="w-full h-[440px] md:h-[560px] object-cover"
              />
              <div className="absolute -bottom-5 -left-5 md:-left-8 bg-white border border-[#e2e8f0] rounded-2xl px-5 py-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.18)]">
                <Editable
                  path="about.badge_name"
                  value={data.badge_name}
                  as="div"
                  className="font-display text-xl text-[#0f172a] block"
                />
                <Editable
                  path={`about.badge_role_${lang}`}
                  value={pick(data.badge_role_de, data.badge_role_en)}
                  as="div"
                  className="text-xs text-[#475569] mt-1 font-medium block"
                />
              </div>
            </div>

            <div className="mt-10 md:mt-12 flex justify-end lg:justify-start">
              <CertificatesDialog triggerClassName="!mt-0 pl-4 pr-6 py-3 text-base [&>span:first-child]:w-9 [&>span:first-child]:h-9 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.25)]" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
