"use client";
import { formatMoney } from "../api/lib/money";

import { Button, Textarea } from "@heroui/react";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ProductDetailSkeleton } from "./skeletons";
import { RichContent } from "./rich-text";
import { RelatedProducts } from "./related-products";
import { waNumber } from "../lib/wa";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiHeart,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingBag,
  FiPhone,
  FiMessageCircle,
  FiStar,
  FiTruck,
} from "react-icons/fi";

const apiUrl = "";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string };
};

type ProductImageDetail = {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
  sortOrder: number;
  isFeatured: boolean;
};

type VariantValue = { id: string; value: string; image?: string };
type ProductVariant = { id: string; name: string; values: VariantValue[] };

type AttributeValue = { id: string; value: string; colorSwatch?: string | null; image?: string | null };
type ProductAttribute = { id: string; name: string; values: AttributeValue[] };

type VariationAttributeLink = {
  attributeId: string;
  valueId: string;
  attribute?: { id: string; name: string };
  value?: AttributeValue;
};

type Variation = {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  salePrice: string | null;
  stock: number;
  manageStock: boolean;
  image: string | null;
  gallery: string[] | null;
  description: string | null;
  status: string;
  attributes: VariationAttributeLink[];
};

function variationMatches(v: Variation, attrs: Record<string, string>): boolean {
  return v.attributes.every((x) => attrs[x.attributeId] === x.valueId);
}

export type Product = {
  id: string;
  slug: string;
  name: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  price: string;
  salePrice: string | null;
  stock: number;
  manageStock?: boolean;
  sku?: string | null;
  productType?: "SIMPLE" | "VARIABLE";
  defaultVariationId?: string | null;
  description: string;
  longDescription?: string | null;
  images: string[];
  categoryId: string;
  categoryLinks?: { categoryId: string }[];
  imagesDetails?: ProductImageDetail[];
  variants?: ProductVariant[];
  variationImages?: Record<string, string>;
  attributes?: ProductAttribute[];
  variations?: Variation[];
  category: { id: string; name: string; slug: string };
  reviews?: Review[];
};

export function ProductView({ slug, initialProduct, contactOptions }: { slug: string; initialProduct?: Product | null; contactOptions?: { callEnabled?: boolean; whatsappEnabled?: boolean; phone?: string; whatsapp?: string; template?: string } }) {
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [activeImg, setActiveImg] = useState<string>("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(!initialProduct);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const initialRef = useRef(initialProduct);
  initialRef.current = initialProduct;

  useEffect(() => {
    let active = true;

    const apply = (data: Product | null) => {
      setProduct(data);
      const variations = data?.variations ?? [];
      const isVar = data?.productType === "VARIABLE" && variations.length > 0;
      if (isVar && data) {
        const act = variations.filter((v: Variation) => v.status !== "disabled");
        const def = variations.find((v: Variation) => v.id === data.defaultVariationId) ?? act[0] ?? variations[0];
        if (def && Array.isArray(data.attributes)) {
          const sel: Record<string, string> = {};
          for (const attr of data.attributes) {
            const link = def.attributes.find((a: VariationAttributeLink) => a.attributeId === attr.id);
            if (link) sel[attr.id] = link.valueId;
          }
          setSelected(sel);
        }
      } else {
        setSelected({});
      }
      const featured = data?.imagesDetails?.find((i: ProductImageDetail) => i.isFeatured)?.url;
      if (featured) setActiveImg(featured);
      else if (data?.images?.length) setActiveImg(data.images[0]);
      setLoading(false);
    };

    const initial = initialRef.current;
    if (initial && initial.slug === slug) {
      apply(initial);
      return;
    }

    fetch(`${apiUrl}/api/products/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) apply(data);
      })
      .catch(() => setLoading(false));

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    fetch(`${apiUrl}/api/wishlist`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ productId: string }>) => setWishlisted(list.some((i) => i.productId === product?.id)))
      .catch(() => {});
  }, [slug]);

  const isVariable = product?.productType === "VARIABLE" && Array.isArray(product?.variations) && (product?.variations?.length ?? 0) > 0;
  const activeVariations = isVariable ? (product?.variations ?? []).filter((v) => v.status !== "disabled") : [];

  useEffect(() => {
    if (!isVariable) {
      setSelectedVariation(null);
      return;
    }
    const match = activeVariations.find((v) => variationMatches(v, selected)) ?? null;
    setSelectedVariation(match);
  }, [selected, isVariable, activeVariations]);

  useEffect(() => {
    if (!selectedVariation) return;
    const valueImage = (product?.attributes ?? [])
      .map((a) => a.values.find((v) => v.id === selected[a.id])?.image)
      .find((img): img is string => Boolean(img));
    const target = selectedVariation.image ?? valueImage;
    if (target) setActiveImg(target);
  }, [selectedVariation, selected, product]);

  useEffect(() => {
    if (!product) return;
    const max = isVariable && selectedVariation ? (selectedVariation.manageStock === false ? 999999 : Number(selectedVariation.stock)) : product.manageStock === false ? 999999 : product.stock;
    if (qty > Math.max(1, max)) setQty(Math.max(1, max));
  }, [selectedVariation, isVariable, product, qty]);

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <main className="product-page" style={{ textAlign: "center", padding: "100px 0" }}>
        <h2>Product not found</h2>
        <Link href="/" className="back-link">
          <FiArrowLeft /> Return to store collection
        </Link>
      </main>
    );
  }

  const finalPrice = isVariable && selectedVariation
    ? Number(selectedVariation.salePrice && Number(selectedVariation.salePrice) < Number(selectedVariation.price) ? selectedVariation.salePrice : selectedVariation.price)
    : Number(product.salePrice && Number(product.salePrice) < Number(product.price) ? product.salePrice : product.price);
  const hasSale = isVariable && selectedVariation ? Boolean(selectedVariation.salePrice && Number(selectedVariation.salePrice) < Number(selectedVariation.price)) : Boolean(product.salePrice && Number(product.salePrice) < Number(product.price));
  const callNumber = (contactOptions?.phone ?? "").replace(/[^\d+]/g, "");
  const whatsappNumber = waNumber(contactOptions?.whatsapp ?? "");
  const whatsappMessage = (contactOptions?.template || "Hello, I want to order {product}.")
    .replaceAll("{product}", product.name)
    .replaceAll("{price}", formatMoney(finalPrice))
    .replaceAll("{quantity}", String(qty))
    .replaceAll("{variation}", selectedVariation?.name ?? "");

  const variationInStock =
    isVariable && selectedVariation
      ? selectedVariation.manageStock === false || Number(selectedVariation.stock) > 0
      : product.manageStock === false || product.stock > 0;
  const showVariationStock = activeVariations.some((variation) => variation.manageStock !== false);

  const displayImages = (() => {
    if (!isVariable) return product.images;
    const list: string[] = [];
    if (selectedVariation?.image) list.push(selectedVariation.image);
    for (const g of selectedVariation?.gallery ?? []) if (g && !list.includes(g)) list.push(g);
    const valueImages = (product.attributes ?? [])
      .map((a) => a.values.find((v) => v.id === selected[a.id])?.image)
      .filter((img): img is string => Boolean(img));
    for (const img of valueImages) if (!list.includes(img)) list.push(img);
    for (const img of product.images) if (!list.includes(img)) list.push(img);
    return list;
  })();

  function isValueAvailable(attrId: string, valueId: string): boolean {
    if (!isVariable) return true;
    const trial = { ...selected, [attrId]: valueId };
    return activeVariations.some((v) => Number(v.stock) > 0 && variationMatches(v, trial));
  }

  function choose(attrId: string, valueId: string, image?: string) {
    if (!product || !isVariable) return;
    const next = { ...selected, [attrId]: valueId };
    const match = activeVariations.find((v) => variationMatches(v, next));
    if (match) {
      const optimum: Record<string, string> = {};
      for (const attr of product.attributes ?? []) {
        const link = match.attributes.find((x) => x.attributeId === attr.id);
        if (link) optimum[attr.id] = link.valueId;
      }
      setSelected(optimum);
    } else {
      setSelected(next);
    }
    if (image) setActiveImg(image);
  }

  function addToCart(redirect = false) {
    if (!product) return;
    if (isVariable && !selectedVariation) {
      toast.error("Please select all options first");
      return;
    }
    const key = isVariable && selectedVariation ? `${product.id}:${selectedVariation.id}` : product.id;
    const old = JSON.parse(localStorage.getItem("epic-cart") ?? "[]");
    const existing = old.find((i: any) => (isVariable ? `${i.id}:${i.variationId}` : i.id) === key);

    const updated = existing
      ? old.map((i: any) => (i === existing ? { ...i, qty: i.qty + qty } : i))
      : [
          ...old,
          {
            id: product.id,
            variationId: isVariable && selectedVariation ? selectedVariation.id : undefined,
            sku: isVariable && selectedVariation ? selectedVariation.sku ?? undefined : undefined,
            slug: product.slug,
            name: isVariable && selectedVariation ? `${product.name} — ${selectedVariation.name}` : product.name,
            images: displayImages.length ? displayImages : product.images,
            price: finalPrice,
            categoryId: product.categoryId,
            categoryIds: product.categoryLinks?.map((link) => link.categoryId) ?? [product.categoryId],
            qty,
          },
        ];

    localStorage.setItem("epic-cart", JSON.stringify(updated));

    if (redirect) {
      window.location.href = "/checkout";
    } else {
      window.location.href = "/";
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();

    setSubmittingReview(true);
    try {
      const res = await fetch(`${apiUrl}/api/products/${product!.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (res.status === 401) {
        toast.error("Sign in to your account to leave a review.");
        return;
      }
      if (!res.ok) throw new Error("Review submission failed");
      toast.success("Your review was submitted and will appear after approval.");
      setComment("");
} catch {
      toast.error("Could not submit your review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function toggleWishlist() {
    if (!product) return;
    setWishlisted((prev) => !prev);
    const res = await fetch(`${apiUrl}/api/wishlist/${product.id}`, { method: "POST" }).catch(() => null);
    if (!res || !res.ok) {
      setWishlisted((prev) => !prev);
      if (res && res.status === 401) {
      toast("Sign in to save this product to your wishlist.");
        window.location.href = "/account";
      }
    }
  }

  return (
    <main className="product-page">
      <Link href="/" className="back-link">
        <FiArrowLeft /> Back to collection
      </Link>

      <div className="product-detail">
        {/* Left Column: Image Showcase */}
        <div>
          <div className="detail-image" onClick={() => setLightboxOpen(true)} role="button" tabIndex={0} aria-label="View image enlarged" style={{ cursor: "zoom-in" }}>
            <ProductImage
              src={activeImg || product.images[0] || "/product-placeholder.svg"}
              alt={product.imagesDetails?.find((i) => i.url === activeImg)?.altText || product.name}
              fill
              sizes="50vw"
              priority
            />
          </div>

          {displayImages.length > 1 && (
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              {displayImages.map((imgUrl, index) => (
                <button
                  key={imgUrl + index}
                  onClick={() => setActiveImg(imgUrl)}
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: activeImg === imgUrl ? "2px solid var(--primary)" : "1px solid var(--border)",
                    cursor: "pointer",
                    padding: 0,
                    background: "none",
                  }}
                >
                  <img src={imgUrl} alt={product.imagesDetails?.[index]?.altText || ""} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/product-placeholder.svg"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            onClick={() => setLightboxOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "zoom-out",
              padding: "24px",
            }}
          >
            <img
              src={activeImg}
              alt={product.name}
              fetchPriority="high"
              decoding="async"
              style={{
                maxWidth: "92vw",
                maxHeight: "88vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            />
            <span style={{ position: "absolute", top: 24, right: 28, color: "#fff", fontSize: 34, lineHeight: 1, cursor: "pointer" }}>×</span>
          </div>
        )}

        {/* Right Column: Details & CTA */}
        <div className="product-detail-info">
          <span className="eyebrow">{product.category.name}</span>
          <h1>{product.name}</h1>

          <div className="price-tag">
            {hasSale && <del>{formatMoney(isVariable ? Number(selectedVariation?.price ?? product.price) : Number(product.price))}</del>}
            <span>{formatMoney(finalPrice)}</span>
          </div>

          {isVariable ? (
            selectedVariation ? (
              selectedVariation.manageStock !== false ? variationInStock ? (
                <div className="stock-badge"><span className="dot" /> In Stock ({selectedVariation.stock} items available)</div>
              ) : (
                <div className="stock-badge" style={{ color: "#ef4444", background: "#fef2f2" }}><span className="dot" style={{ background: "#ef4444" }} /> Out of stock</div>
              ) : null
            ) : showVariationStock ? (
              <div className="stock-badge" style={{ color: "#ef4444", background: "#fef2f2" }}><span className="dot" style={{ background: "#ef4444" }} /> Select options to check availability</div>
            ) : null
          ) : product.manageStock ? product.stock > 0 ? (
            <div className="stock-badge"><span className="dot" /> In Stock ({product.stock} items available)</div>
          ) : (
            <div className="stock-badge" style={{ color: "#ef4444", background: "#fef2f2" }}><span className="dot" style={{ background: "#ef4444" }} /> Out of stock</div>
          ) : null}

          <RichContent className="description" value={selectedVariation?.description || product.description} />

          {isVariable && product.attributes && product.attributes.length > 0 && (
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {product.attributes.map((attr) => (
                <div key={attr.id}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
                    {attr.name}
                    {selected[attr.id] && (
                      <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                        {" "}— {attr.values.find((v) => v.id === selected[attr.id])?.value}
                      </span>
                    )}
                    {selected[attr.id] && (
                      <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.74rem", marginLeft: "8px" }}>
                        SKU: {selectedVariation?.sku || product.sku || "-"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {attr.values.map((val) => {
                      const activeVal = selected[attr.id] === val.id;
                      const available = isValueAvailable(attr.id, val.id);
                      const swatch = val.colorSwatch;
                      return (
                        <button
                          key={val.id}
                          onClick={() => available && choose(attr.id, val.id, val.image ?? undefined)}
                          style={{
                            padding: "7px 14px",
                            borderRadius: "999px",
                            border: activeVal ? "2px solid var(--primary)" : "1px solid var(--border)",
                            background: activeVal ? "var(--primary)" : swatch ? swatch : "transparent",
                            color: activeVal ? (swatch ? "#fff" : "#fff") : swatch ? "#fff" : "var(--ink)",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: available ? "pointer" : "not-allowed",
                            opacity: available ? 1 : 0.35,
                            textDecoration: available ? "none" : "line-through",
                            transition: "all .15s ease",
                          }}
                        >
                          {val.image && !swatch && (
                            <img
                              src={val.image}
                              alt=""
                              style={{ width: 22, height: 22, borderRadius: 50, objectFit: "cover", verticalAlign: "middle", marginRight: 6, border: "1px solid var(--border)" }}
                            />
                          )}
                          {val.value}
                          {!available && <span style={{ marginLeft: 4, fontSize: "0.7rem" }}>— sold out</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}



          {/* Quantity Selector */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>
              QUANTITY
            </label>
            <div className="qty-control" style={{ padding: "6px 14px" }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <FiMinus />
              </button>
              <span style={{ fontSize: "1rem", minWidth: "30px", textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)}>
                <FiPlus />
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "36px" }}>
            <Button
              color="primary"
              size="lg"
              className="flex-1 font-bold shadow-lg"
              isDisabled={isVariable ? !selectedVariation || !variationInStock : product.manageStock && !product.stock}
              onPress={() => addToCart(true)}
            >
              Buy now
            </Button>
            <Button
              variant="flat"
              size="lg"
              className="flex-1 font-bold"
              isDisabled={isVariable ? !selectedVariation || !variationInStock : product.manageStock && !product.stock}
              onPress={() => addToCart(false)}
            >
              <FiShoppingBag /> Add to bag
            </Button>
            <Button
              variant="bordered"
              size="lg"
              aria-label="Add to wishlist"
              onPress={toggleWishlist}
              style={{ color: wishlisted ? "#ef4444" : "inherit", borderColor: wishlisted ? "#ef4444" : undefined }}
            >
              <FiHeart fill={wishlisted ? "#ef4444" : "none"} />
            </Button>
          </div>

          {(contactOptions?.callEnabled && callNumber || contactOptions?.whatsappEnabled && whatsappNumber) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginTop: "-20px", marginBottom: "36px" }}>
              {contactOptions?.callEnabled && callNumber && <a href={`tel:${callNumber}`} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700"><FiPhone /> Call</a>}
              {contactOptions?.whatsappEnabled && whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"><FiMessageCircle /> Order on WhatsApp</a>}
            </div>
          )}

          {/* Trust Highlights */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px",
              display: "grid",
              gap: "14px",
              fontSize: "0.88rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FiTruck style={{ color: "var(--primary)", fontSize: "1.2rem" }} />
              <span>Fast, reliable delivery</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FiShield style={{ color: "var(--primary)", fontSize: "1.2rem" }} />
              <span>Quality products, guaranteed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FiCheckCircle style={{ color: "var(--primary)", fontSize: "1.2rem" }} />
              <span>Cash on delivery available</span>
            </div>
          </div>

        </div>
      </div>

      {product.longDescription && (
            <div className="product-long-description">
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "var(--ink)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Product Details
              </span>
              <RichContent value={product.longDescription} />
            </div>
          )}
      {/* Customer Reviews Section */}
      <section className="product-reviews" style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid var(--border)" }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.8rem", marginBottom: "24px" }}>
          Customer reviews ({product.reviews?.length ?? 0})
        </h2>

        <div className="reviews-grid">
          {/* Reviews List */}
          <div style={{ display: "grid", gap: "16px" }}>
            {!product.reviews?.length ? (
              <p style={{ color: "var(--muted)" }}>No reviews yet. Be the first to write one!</p>
            ) : (
              product.reviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    background: "var(--surface)",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "0.95rem" }}>{rev.user.name}</strong>
                    <div style={{ display: "flex", gap: "2px", color: "#f59e0b" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar key={star} fill={star <= rev.rating ? "#f59e0b" : "none"} style={{ fontSize: "0.9rem" }} />
                      ))}
                    </div>
                  </div>
                  {rev.comment && <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-secondary)" }}>{rev.comment}</p>}
                </div>
              ))
            )}
          </div>

          {/* Review Submission Form */}
          <form
            onSubmit={submitReview}
            style={{
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              display: "grid",
              gap: "16px",
              height: "fit-content",
            }}
          >
            <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif" }}>Write a review</h3>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>
                Rating
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    style={{
                      border: 0,
                      background: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: star <= rating ? "#f59e0b" : "#cbd5e1",
                      fontSize: "1.5rem",
                    }}
                  >
                    <FiStar fill={star <= rating ? "#f59e0b" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Your review"
              placeholder="Share your thoughts about this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              minRows={3}
            />

            <Button type="submit" color="primary" isLoading={submittingReview} className="font-bold shadow-md">
              Submit review
            </Button>
          </form>
        </div>
      </section>

      <RelatedProducts productId={product.id} categorySlug={product.category.slug} />
    </main>
  );
}
