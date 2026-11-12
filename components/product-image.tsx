"use client";

import Image, { type ImageProps } from "next/image";

const PLACEHOLDER = "/product-placeholder.svg";

export function ProductImage(props: ImageProps) {
  return (
    <Image
      {...props}
      onError={(event) => {
        props.onError?.(event);
        const image = event.currentTarget;
        if (image.dataset.placeholderApplied === "true") return;
        image.dataset.placeholderApplied = "true";
        image.srcset = "";
        image.src = PLACEHOLDER;
      }}
    />
  );
}
