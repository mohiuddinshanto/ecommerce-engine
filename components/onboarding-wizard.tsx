"use client";

import { Button, Input } from "@heroui/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { FiCheckCircle, FiLock, FiMail, FiShoppingBag, FiUser } from "react-icons/fi";

const apiUrl = "";

export function OnboardingWizard() {
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState("#4f46e5");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      storeName: form.get("storeName"),
      adminName: form.get("adminName"),
      adminEmail: form.get("adminEmail"),
      password: form.get("password"),
      themeSettings: {
        primaryColor: color,
        secondaryColor: "#ffffff",
        font: "Plus Jakarta Sans",
      },
    };

    try {
      const response = await fetch(`${apiUrl}/api/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).error);

      toast.success("স্টোর সেটআপ সফলভাবে সম্পন্ন হয়েছে!");
      window.location.href = "/?refresh_onboarding=1";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-shell">
      <form className="wizard" onSubmit={submit}>
        <div style={{ textAlign: "center" }}>
          <Link href="/" className="brand" style={{ justifyContent: "center", marginBottom: "12px" }}>
            EPIC<span>.</span>
          </Link>
          <span className="eyebrow">স্টোর সেটআপ</span>
          <h1>আপনার স্টোর সেটআপ করুন</h1>
          <p style={{ color: "var(--muted)", margin: "8px 0 0", fontSize: "0.9rem" }}>
            আপনার অ্যাডমিন তথ্য দিন এবং স্টোরের থিম বেছে নিন।
          </p>
        </div>

        <Input
          isRequired
          name="storeName"
          label="Store Name"
          placeholder="e.g. EPIC Essentials"
          startContent={<FiShoppingBag className="text-gray-400" />}
        />

        <Input
          isRequired
          name="adminName"
          label="Admin Name"
          placeholder="e.g. Mohiuddin"
          startContent={<FiUser className="text-gray-400" />}
        />

        <Input
          isRequired
          name="adminEmail"
          type="email"
          label="Admin Email"
          placeholder="admin@example.com"
          startContent={<FiMail className="text-gray-400" />}
        />

        <Input
          isRequired
          name="password"
          type="password"
          label="Admin Password"
          placeholder="••••••••"
          minLength={8}
          startContent={<FiLock className="text-gray-400" />}
        />

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>
            Brand Accent Color
          </label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                cursor: "pointer",
                padding: 0,
              }}
            />
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>{color}</span>
          </div>
        </div>

        <Button type="submit" color="primary" size="lg" isLoading={loading} className="font-bold shadow-lg mt-2">
          <FiCheckCircle /> Complete Store Setup
        </Button>
      </form>
    </div>
  );
}
