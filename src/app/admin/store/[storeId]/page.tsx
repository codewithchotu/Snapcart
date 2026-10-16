"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function StoreOwnerDashboard({ params }: { params: Promise<{ storeId: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [store, setStore] = useState<any>(null);

  // Resolve async params
  useEffect(() => {
    params.then(p => setStoreId(p.storeId))
  }, [params])

  useEffect(() => {
    if (!storeId || !session?.user) return;
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/admin/store/${storeId}`);
        if (!res.ok) throw new Error();
        const s = await res.json();
        if (session?.user?.id !== s.owner) {
          router.push("/admin");
          return;
        }
        setStore(s);
        // Generate QR dynamically
        const QRCode = (await import("qrcode")).default;
        const qrUrl = await QRCode.toDataURL(s.storeCode, {
          width: 280,
          margin: 2,
          color: { dark: "#166534", light: "#fff" },
        });
        setQr(qrUrl);
      } catch {
        router.push("/admin");
      }
    };
    fetchStore();
  }, [storeId, session, router]);

  if (!store) return <p className="p-4 pt-28">Loading…</p>;

  return (
    <section className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-28">
      <h2 className="text-2xl font-bold mb-4">{store.name} – QR Code</h2>
      <p className="text-sm text-gray-500 mb-4">
        Store Code: <span className="font-mono font-bold text-green-700">{store.storeCode}</span>
      </p>
      {qr && (
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Store QR" width={200} height={200} className="rounded" />
        </div>
      )}
      <a
        href={qr ?? "#"}
        download={`${store.name.replace(/\s+/g, "_")}_QR.png`}
        className="block text-center bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition mb-3"
      >
        Download QR PNG
      </a>
      <button
        onClick={() => window.print()}
        className="w-full bg-gray-600 text-white py-2 rounded-xl hover:bg-gray-700 transition"
      >
        Print Poster
      </button>
    </section>
  );
}
