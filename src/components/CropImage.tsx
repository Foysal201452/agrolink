import { useState } from "react";

import avocadoImg from "@/images/avocado.jpg";
import bananasImg from "@/images/bananas.jpg";
import cornImg from "@/images/corn.jpg";
import mangoesImg from "@/images/mangoes.jpg";
import peasImg from "@/images/peas.jpg";
import potatoesImg from "@/images/potatoes.jpg";
import riceImg from "@/images/rice.jpg";
import tomatoImg from "@/images/tomato.jpg";

function isImageUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || v.startsWith("/");
}

const seedImageMap: Record<string, string> = {
  tomato: tomatoImg,
  corn: cornImg,
  avocado: avocadoImg,
  peas: peasImg,
  mango: mangoesImg,
  rice: riceImg,
  potatoes: potatoesImg,
  bananas: bananasImg,
};

function resolveSeedImage(value: string) {
  const v = value.trim();
  const m = /^seed:([a-z0-9_-]+)$/i.exec(v);
  if (!m) return null;
  const key = m[1]!.toLowerCase();
  return seedImageMap[key] ?? null;
}

export function CropImage({
  src,
  alt,
  size = 56,
  className = "",
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const val = (src ?? "").trim();
  const resolvedSeed = resolveSeedImage(val);
  const imgSrc = resolvedSeed ?? val;

  if (!imgSrc) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-muted/40 border border-border/50 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  if (broken || !isImageUrl(imgSrc)) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-muted/30 border border-border/50 ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
        title={alt}
      >
        <span className="text-3xl leading-none">{val}</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`rounded-xl border border-border/50 object-cover bg-muted/20 ${className}`}
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  );
}

