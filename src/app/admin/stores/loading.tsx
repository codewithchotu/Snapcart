import React from "react";
import { Loader2, Store } from "lucide-react";

export default function AdminStoresLoading() {
  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-xl max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-600 dark:text-green-400">
          <Store className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
            Store Control Center
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resolving session & verifying permissions...
          </p>
        </div>
        <Loader2 className="w-6 h-6 text-green-600 dark:text-green-400 animate-spin mt-2" />
      </div>
    </div>
  );
}
