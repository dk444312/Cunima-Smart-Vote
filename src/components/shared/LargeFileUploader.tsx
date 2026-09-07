import React, { useState } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const WORKER_URL = "https://voting-upload-worker.desire-kandodo.workers.dev/";
const PUBLIC_R2_DOMAIN = "https://pub-760d95919bad43f0a4ebab68deb52ebd.r2.dev"; 

interface LargeFileUploaderProps {
  onUploadSuccess: (url: string) => void;
  accept?: string;
  label?: string;
}

export function LargeFileUploader({
  onUploadSuccess,
  accept = "image/*,video/*",
  label = "Upload Media",
}: LargeFileUploaderProps) {
  const [password, setPassword] = useState(
    (import.meta as any).env?.VITE_UPLOADER_PASSWORD || ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);

  const handleUpload = async () => {
    if (!file || !password) return;
    setUploading(true);
    setStatus("Generating secure upload link...");
    setError(false);

    try {
      // STEP 1: Ask Worker for presigned upload URL
      const presignedRes = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Uploader-Password": password.trim(),
        },
        body: JSON.stringify({ fileName: file.name }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok) {
        throw new Error(presignedData.error || "Authentication failed.");
      }

      // STEP 2: Upload file directly to Cloudflare R2
      // Note: Extra headers like Content-Type are omitted here so they don't break the AWS SigV4 signature
      setStatus(
        `Uploading ${Math.round(file.size / (1024 * 1024))} MB directly to R2...`
      );

      const uploadRes = await fetch(presignedData.uploadUrl, {
        method: "PUT",
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Direct R2 upload failed with status ${uploadRes.status}`);
      }

      setStatus(`Upload Complete!`);

      // Construct public viewable media URL
      const finalMediaUrl = `${PUBLIC_R2_DOMAIN}/${presignedData.fileKey}`;
      onUploadSuccess(finalMediaUrl);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
      setError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
      <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
        <UploadCloud className="w-4 h-4" />
        {label} (&gt;100 MB Supported)
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter uploader password"
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-[#0B1E40] dark:focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Select File
          </label>
          <input
            type="file"
            accept={accept}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
            className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#0B1E40]/10 file:text-[#0B1E40] hover:file:bg-[#0B1E40]/20 dark:file:bg-blue-500/20 dark:file:text-blue-400 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || !password || uploading}
          className="w-full py-2.5 bg-[#0B1E40] hover:bg-blue-900 text-white font-semibold text-xs rounded-full shadow-md shadow-[#0B1E40]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Start Upload
            </>
          )}
        </button>

        {status && (
          <div
            className={`mt-2 p-2 rounded-lg flex items-start gap-2 text-xs font-medium ${
              error
                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {error ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="break-all">{status}</span>
          </div>
        )}
      </div>
    </div>
  );
}