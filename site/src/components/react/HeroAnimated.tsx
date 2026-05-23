import { motion, useMotionValue, useSpring, useTransform, useInView, animate } from "framer-motion";
import { Fragment, useEffect, useRef, useState } from "react";

type Stat = { value: number | string; suffix?: string; label: string };

interface Props {
  totalEngines: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function SpringCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return <span ref={ref}>{val}{suffix}</span>;
}

function MagneticButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14 });
  const sy = useSpring(y, { stiffness: 180, damping: 14 });

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set(dx * 0.25);
    y.set(dy * 0.35);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  const base = primary
    ? "bg-[var(--c-red)] text-white border border-[var(--c-red)] hover:bg-[var(--c-red-dark)] shadow-[0_12px_40px_rgba(229,9,20,0.25)]"
    : "bg-transparent text-white border border-white/25 hover:bg-white hover:text-slate-900";

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={`relative inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-[0.95rem] min-h-[48px] transition-colors duration-200 ${base}`}
    >
      {children}
      <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>
    </motion.a>
  );
}

export default function HeroAnimated({ totalEngines }: Props) {
  const titleWords = ["Запчасти", "для"];
  const accentWords = ["капитального", "ремонта"];
  const tailWords = ["двигателя"];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20 });
  const sy = useSpring(my, { stiffness: 50, damping: 20 });
  const tx = useTransform(sx, (v) => v * 20);
  const ty = useTransform(sy, (v) => v * 20);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [mx, my]);

  const stats: Stat[] = [
    { value: totalEngines, label: "двигателей в каталоге" },
    { value: 20, suffix: "+", label: "брендов запчастей" },
    { value: 15, suffix: " лет", label: "на рынке Алматы" },
    { value: "24/7", label: "приём заказов в WhatsApp" },
  ];

  const wordVariants = {
    hidden: { y: "110%", opacity: 0 },
    visible: { y: "0%", opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 16 } },
  };

  return (
    <section ref={containerRef} className="relative isolate overflow-hidden bg-surface-950 text-white pt-[120px] max-md:pt-16 max-sm:pt-12">
      {/* Animated mesh-gradient backdrop */}
      <motion.div style={{ x: tx, y: ty }} className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 -right-24 w-[600px] h-[600px] rounded-full opacity-55 blur-[80px] bg-[radial-gradient(circle,var(--c-red)_0%,transparent_70%)] animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-36 -left-24 w-[500px] h-[500px] rounded-full opacity-55 blur-[80px] bg-[radial-gradient(circle,#6b0610_0%,transparent_70%)] animate-[drift_25s_ease-in-out_-10s_infinite]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      </motion.div>

      <div className="container mx-auto max-w-[1240px] px-6 max-sm:px-4 relative text-center pb-16 max-sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.12] text-[0.82rem] text-white/85 mb-8 backdrop-blur-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
          В наличии · Алматы · Доставка по РК
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.08, delayChildren: 0.15 }}
          className="font-display font-extrabold leading-[1.05] tracking-[-0.04em] mb-6 text-[clamp(2.2rem,7vw,5.5rem)] max-sm:text-[2rem] max-sm:leading-[1.1]"
        >
          <span className="block overflow-hidden">
            {titleWords.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
                <motion.span variants={wordVariants} className="inline-block">{w}</motion.span>
              </span>
            ))}
          </span>
          <span className="block overflow-hidden">
            {accentWords.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
                <motion.span
                  variants={wordVariants}
                  className="inline-block bg-gradient-to-br from-[var(--c-red)] via-[#ff5760] to-[#ff8a92] bg-clip-text text-transparent"
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </span>
          <span className="block overflow-hidden">
            {tailWords.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom">
                <motion.span variants={wordVariants} className="inline-block">{w}</motion.span>
              </span>
            ))}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}
          className="text-white/75 max-w-[640px] mx-auto mb-10 leading-[1.55] text-[clamp(1.05rem,1.6vw,1.25rem)] max-sm:text-base max-sm:mb-6"
        >
          Поршни, кольца, вкладыши, прокладки ГБЦ для Toyota, Nissan, Mitsubishi, Mazda
          и других японских авто. Японские бренды TEIKIN, IZUMI, NPR, RIK, Taiho, NDC.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.7 }}
          className="flex flex-wrap justify-center gap-3 max-sm:flex-col"
        >
          <MagneticButton href="#picker" primary>Подобрать запчасти</MagneticButton>
          <MagneticButton href="/zapchasti/porshni/">Открыть каталог</MagneticButton>
        </motion.div>
      </div>

      {/* Stat bar with spring counters */}
      <div className="container mx-auto max-w-[1240px] px-6 max-sm:px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.5, staggerChildren: 0.08 }}
          className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] max-md:grid-cols-2 max-md:gap-y-6 items-center gap-6 py-8 px-6 max-md:px-4 bg-white/[0.04] backdrop-blur-md border-t border-white/[0.08]"
        >
          {stats.map((s, i) => (
            <Fragment key={i}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
                className="text-center"
              >
                <div className="font-display font-extrabold text-white leading-none mb-2 tracking-[-0.03em] text-[clamp(1.8rem,3vw,2.6rem)] tabular-nums max-sm:text-[1.6rem]">
                  {typeof s.value === "number" ? (
                    <SpringCounter to={s.value} suffix={s.suffix} />
                  ) : (
                    s.value
                  )}
                </div>
                <div className="text-[0.85rem] text-white/60 uppercase tracking-[0.08em] max-sm:text-[0.72rem]">
                  {s.label}
                </div>
              </motion.div>
              {i < stats.length - 1 && <div className="w-px h-10 bg-white/10 max-md:hidden" />}
            </Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
