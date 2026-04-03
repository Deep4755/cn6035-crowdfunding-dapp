import { toast } from "react-hot-toast";

/**
 * Wraps a blockchain transaction with three-state toast feedback:
 * pending → confirming → success / error
 *
 * Usage:
 *   await txToast(
 *     () => contract.pledge(...),
 *     { pending: "Waiting...", success: "Done!" }
 *   );
 */
export async function txToast<T>(
  fn: () => Promise<{ wait: () => Promise<T> }>,
  messages: {
    pending?: string;
    confirming?: string;
    success?: string;
    error?: string;
  } = {}
): Promise<T> {
  const {
    pending    = "Waiting for wallet confirmation...",
    confirming = "Transaction is being confirmed...",
    success    = "Transaction successful!",
    error      = "Transaction failed or rejected.",
  } = messages;

  // Step 1 — waiting for MetaMask approval
  const toastId = toast.loading(pending, {
    style: pendingStyle,
    iconTheme: { primary: "#6366f1", secondary: "#fff" },
  });

  let tx: { wait: () => Promise<T> };

  try {
    tx = await fn();
  } catch (err) {
    toast.error(friendlyError(err, error), {
      id: toastId,
      duration: 6000,
      style: errorStyle,
    });
    throw err;
  }

  // Step 2 — tx submitted, waiting for block confirmation
  toast.loading(confirming, {
    id: toastId,
    style: confirmingStyle,
    iconTheme: { primary: "#f59e0b", secondary: "#fff" },
  });

  try {
    const receipt = await tx.wait();
    toast.success(success, {
      id: toastId,
      duration: 4000,
      style: successStyle,
    });
    return receipt;
  } catch (err) {
    toast.error(friendlyError(err, error), {
      id: toastId,
      duration: 6000,
      style: errorStyle,
    });
    throw err;
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function friendlyError(err: unknown, fallback: string): string {
  const e = err as { shortMessage?: string; reason?: string; message?: string; code?: number | string };
  const code = String(e.code ?? "");
  if (code === "4001" || (e.message ?? "").toLowerCase().includes("user rejected")) {
    return "Transaction cancelled — you rejected the request in MetaMask.";
  }
  return e.shortMessage ?? e.reason ?? e.message ?? fallback;
}

// ─── styles ─────────────────────────────────────────────────────────────────

const base = {
  borderRadius: "12px",
  fontSize: "13px",
  fontWeight: "500",
  padding: "10px 14px",
  maxWidth: "360px",
};

const pendingStyle = {
  ...base,
  background: "#eef2ff",
  color: "#4338ca",
  border: "1px solid #c7d2fe",
};

const confirmingStyle = {
  ...base,
  background: "#fffbeb",
  color: "#92400e",
  border: "1px solid #fde68a",
};

const successStyle = {
  ...base,
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
};

const errorStyle = {
  ...base,
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};
