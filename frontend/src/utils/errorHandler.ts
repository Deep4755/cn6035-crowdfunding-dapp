/**
 * Error handling utility for blockchain transactions
 * Provides user-friendly error messages from various error types
 */

interface ParsedError {
  message: string;
  userFriendly: string;
  code?: string;
}

/**
 * Parse blockchain errors and return user-friendly messages
 */
export function parseTransactionError(error: unknown): ParsedError {
  const err = error as {
    message?: string;
    shortMessage?: string;
    info?: {
      error?: {
        message?: string;
        code?: number | string;
      };
      data?: string;
    };
    code?: string | number;
    reason?: string;
    error?: {
      message?: string;
      code?: number | string;
    };
  };

  // Get the error message from various possible locations
  let errorMessage = 
    err.shortMessage ||
    err.reason ||
    err.info?.error?.message ||
    err.error?.message ||
    err.message ||
    "An unknown error occurred";

  // Get error code
  const errorCode = 
    String(err.code || err.info?.error?.code || err.error?.code || "").toLowerCase();

  // Parse common error patterns
  errorMessage = errorMessage.toLowerCase();

  // Insufficient funds errors
  if (
    errorMessage.includes("insufficient funds") ||
    errorCode.includes("insufficient") ||
    errorMessage.includes("not enough funds")
  ) {
    // Try to extract balance information from error message
    const balanceMatch = errorMessage.match(/have\s+(\d+)\s+want\s+(\d+)/);
    if (balanceMatch) {
      const haveWei = BigInt(balanceMatch[1]);
      const wantWei = BigInt(balanceMatch[2]);
      const haveEth = Number(haveWei) / 1e18;
      const wantEth = Number(wantWei) / 1e18;
      const neededEth = wantEth - haveEth;

      return {
        message: errorMessage,
        userFriendly: `Insufficient funds. You need ${wantEth.toFixed(4)} ETH (including gas fees) but only have ${haveEth.toFixed(4)} ETH. Please add at least ${neededEth.toFixed(4)} more ETH to your wallet.`,
        code: "INSUFFICIENT_FUNDS",
      };
    }

    // Generic insufficient funds message
    return {
      message: errorMessage,
      userFriendly: "Insufficient funds. You don't have enough ETH to complete this transaction. Please add more ETH to your wallet and ensure you have enough for both the transaction amount and gas fees.",
      code: "INSUFFICIENT_FUNDS",
    };
  }

  // User rejected transaction
  if (
    errorMessage.includes("user rejected") ||
    errorMessage.includes("user denied") ||
    errorMessage.includes("rejected") ||
    errorCode === "4001" ||
    errorCode === "-32603"
  ) {
    return {
      message: errorMessage,
      userFriendly: "Transaction cancelled. You rejected the transaction request in MetaMask.",
      code: "USER_REJECTED",
    };
  }

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout")
  ) {
    return {
      message: errorMessage,
      userFriendly: "Network error. Please check your internet connection and try again. If the problem persists, try switching to a different network or check MetaMask settings.",
      code: "NETWORK_ERROR",
    };
  }

  // Gas estimation errors
  if (
    errorMessage.includes("gas") ||
    errorMessage.includes("execution reverted")
  ) {
    // Check if it's a revert with a reason
    if (errorMessage.includes("revert")) {
      const revertReason = extractRevertReason(errorMessage);
      if (revertReason) {
        return {
          message: errorMessage,
          userFriendly: `Transaction would fail: ${revertReason}. Please check the campaign requirements and try again.`,
          code: "TRANSACTION_REVERTED",
        };
      }
    }

    return {
      message: errorMessage,
      userFriendly: "Transaction would fail. This could be due to insufficient funds, incorrect parameters, or the campaign state has changed. Please check your balance and the campaign status.",
      code: "GAS_ESTIMATION_FAILED",
    };
  }

  // Contract-specific errors (from require statements)
  if (errorMessage.includes("campaign does not exist")) {
    return {
      message: errorMessage,
      userFriendly: "Campaign not found. This campaign may have been removed or the ID is incorrect.",
      code: "CAMPAIGN_NOT_FOUND",
    };
  }

  if (errorMessage.includes("campaign inactive") || errorMessage.includes("campaign not active")) {
    return {
      message: errorMessage,
      userFriendly: "Campaign is not active. This campaign may have ended, not started yet, or is inactive.",
      code: "CAMPAIGN_INACTIVE",
    };
  }

  if (errorMessage.includes("contribution below reward minimum")) {
    return {
      message: errorMessage,
      userFriendly: "Your contribution is below the minimum required for the selected reward. Please increase your contribution amount.",
      code: "BELOW_MINIMUM",
    };
  }

  if (errorMessage.includes("reward sold out")) {
    return {
      message: errorMessage,
      userFriendly: "This reward is sold out. Please select a different reward or contribute without a reward.",
      code: "REWARD_SOLD_OUT",
    };
  }

  if (errorMessage.includes("goal not reached")) {
    return {
      message: errorMessage,
      userFriendly: "Campaign goal was not reached. The creator cannot withdraw funds until the goal is met.",
      code: "GOAL_NOT_REACHED",
    };
  }

  if (errorMessage.includes("already withdrawn") || errorMessage.includes("already claimed")) {
    return {
      message: errorMessage,
      userFriendly: "This action has already been completed. Funds have already been withdrawn or claimed.",
      code: "ALREADY_COMPLETED",
    };
  }

  if (errorMessage.includes("not creator")) {
    return {
      message: errorMessage,
      userFriendly: "Only the campaign creator can perform this action.",
      code: "NOT_CREATOR",
    };
  }

  if (errorMessage.includes("campaign not ended")) {
    return {
      message: errorMessage,
      userFriendly: "Campaign has not ended yet. Please wait until the campaign ends to withdraw funds.",
      code: "CAMPAIGN_NOT_ENDED",
    };
  }

  if (errorMessage.includes("must send eth") || errorMessage.includes("value must be greater than 0")) {
    return {
      message: errorMessage,
      userFriendly: "Please enter a contribution amount greater than 0.",
      code: "INVALID_AMOUNT",
    };
  }

  // Return generic friendly message for unknown errors
  return {
    message: errorMessage,
    userFriendly: `Transaction failed: ${errorMessage}. Please try again or contact support if the problem persists.`,
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Extract revert reason from error message
 */
function extractRevertReason(errorMessage: string): string | null {
  // Try to find revert reason in various formats
  const patterns = [
    /revert\s+"([^"]+)"/i,
    /revert\s+([^\s]+)/i,
    /reason:\s*(.+)/i,
    /execution reverted:\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Check if user has sufficient balance for a transaction
 */
export async function checkBalance(
  amount: bigint,
  userAddress: string | null,
  provider: { getBalance: (address: string) => Promise<bigint> } | null
): Promise<{ sufficient: boolean; balance: bigint; needed: bigint; shortfall: bigint }> {
  if (!userAddress || !provider) {
    return {
      sufficient: false,
      balance: 0n,
      needed: amount,
      shortfall: amount,
    };
  }

  try {
    const balance = await provider.getBalance(userAddress);
    // Estimate gas cost (rough estimate: 100,000 gas units * 20 gwei)
    // This is a conservative estimate - actual gas may vary
    const estimatedGasCost = 100000n * 20000000000n; // 100k gas * 20 gwei
    const totalNeeded = amount + estimatedGasCost;
    const shortfall = totalNeeded > balance ? totalNeeded - balance : 0n;

    return {
      sufficient: balance >= totalNeeded,
      balance,
      needed: totalNeeded,
      shortfall,
    };
  } catch {
    return {
      sufficient: false,
      balance: 0n,
      needed: amount,
      shortfall: amount,
    };
  }
}

