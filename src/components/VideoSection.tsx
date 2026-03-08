import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const VideoSection = () => {
  const [playing, setPlaying] = useState(false);

  const { data: videoId, isLoading } = useQuery({
    queryKey: ["site-setting", "video_youtube_id"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "video_youtube_id")
        .maybeSingle();
      return (data?.value as string) || null;
    },
  });

  if (isLoading || !videoId) return null;

  return (
    <section ref={ref} className="relative py-24 overflow-hidden bg-secondary">
      {/* Scrolling text background */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-secondary-foreground font-black text-[100px] whitespace-nowrap"
            style={{ top: `${i * 18}%`, right: "-5%" }}
            animate={{ x: i % 2 === 0 ? ["0%", "-30%"] : ["-30%", "0%"] }}
            transition={{ duration: 40 + i * 5, repeat: Infinity, ease: "linear" }}
          >
            المصرية جروب ● TOYOTA GENUINE ● قطع غيار أصلية ● المصرية جروب ● TOYOTA GENUINE ●
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/15 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Play className="w-4 h-4 fill-primary" />
            تعرّف علينا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-secondary-foreground mb-3">
            شاهد <span className="shimmer-text">قصة نجاحنا</span>
          </h2>
          <p className="text-secondary-foreground/60 max-w-lg mx-auto">
            25 عامًا من التميز في توزيع قطع غيار وزيوت تويوتا الأصلية
          </p>
        </motion.div>

        {/* Video container */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-secondary-foreground/10 group">
            {!playing ? (
              <>
                {/* Thumbnail */}
                <div className="relative aspect-video bg-secondary">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="فيديو المصرية جروب"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/30 to-secondary/10" />
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                {/* Play button */}
                <motion.button
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  whileHover="hover"
                >
                  <motion.div
                    className="absolute w-24 h-24 rounded-full border-2 border-primary/40"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute w-24 h-24 rounded-full border-2 border-primary/20"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  />
                  <motion.div
                    className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center red-glow z-10"
                    variants={{ hover: { scale: 1.12 } }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-8 h-8 text-primary-foreground fill-primary-foreground mr-[-2px]" />
                  </motion.div>
                </motion.button>

                <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between">
                  <span className="text-secondary-foreground/70 text-sm font-semibold bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
                    المصرية جروب — الفيلم التعريفي
                  </span>
                </div>
              </>
            ) : (
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="فيديو المصرية جروب"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
                <motion.button
                  onClick={() => setPlaying(false)}
                  className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VideoSection;
