import type { Campaign } from "@/types";
import { ethers } from "ethers";

/**
 * Sample campaigns for guest mode and demonstration purposes
 * These campaigns are displayed when users browse without connecting a wallet
 */
export function getSampleCampaigns(currentTime: number): Campaign[] {
  // Calculate timestamps relative to current time
  const oneDayInSeconds = 24 * 60 * 60;
  const oneWeekInSeconds = 7 * oneDayInSeconds;
  const oneMonthInSeconds = 30 * oneDayInSeconds;

  return [
    {
      id: 1001,
      creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      goal: ethers.parseEther("15"),
      pledged: ethers.parseEther("12.5"),
      startAt: BigInt(currentTime - oneWeekInSeconds),
      endAt: BigInt(currentTime + oneWeekInSeconds),
      claimed: false,
      metadataURI: "HydroClean — Eco-friendly reusable water bottle. Category: Environment. Durable, insulated bottle made from recycled materials.",
    },
    {
      id: 1002,
      creator: "0x8ba1f109551bD432803012645Hac136c9c8dF0E4",
      goal: ethers.parseEther("50"),
      pledged: ethers.parseEther("48.2"),
      startAt: BigInt(currentTime - 3 * oneDayInSeconds),
      endAt: BigInt(currentTime + 4 * oneDayInSeconds),
      claimed: false,
      metadataURI: "HomeIQ — Smart home automation hub. Category: Technology. Privacy-first hub to unify devices with local control and easy setup.",
    },
    {
      id: 1003,
      creator: "0x1234567890123456789012345678901234567890",
      goal: ethers.parseEther("25"),
      pledged: ethers.parseEther("28.5"),
      startAt: BigInt(currentTime - oneMonthInSeconds),
      endAt: BigInt(currentTime - oneDayInSeconds),
      claimed: true,
      metadataURI: "PixelQuest — Story-driven indie adventure game. Category: Gaming. Hand-crafted pixel art, branching narrative, and community-driven content.",
    },
    {
      id: 1004,
      creator: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      goal: ethers.parseEther("10"),
      pledged: ethers.parseEther("7.2"),
      startAt: BigInt(currentTime - oneMonthInSeconds),
      endAt: BigInt(currentTime - 2 * oneDayInSeconds),
      claimed: false,
      metadataURI: "StrideSense — Wearable fitness tracker. Category: Health. Comfortable tracker with long battery life and advanced sleep analytics.",
    },
    {
      id: 1005,
      creator: "0xfedcba0987654321098765432109876543210987",
      goal: ethers.parseEther("100"),
      pledged: ethers.parseEther("5.8"),
      startAt: BigInt(currentTime + 2 * oneDayInSeconds),
      endAt: BigInt(currentTime + oneMonthInSeconds),
      claimed: false,
      metadataURI: "SunGrid — Community solar microgrid kits. Category: Energy. Affordable plug-and-play solar systems for neighborhoods and small businesses.",
    },
    {
      id: 1006,
      creator: "0x9876543210987654321098765432109876543210",
      goal: ethers.parseEther("30"),
      pledged: ethers.parseEther("32.1"),
      startAt: BigInt(currentTime - oneWeekInSeconds),
      endAt: BigInt(currentTime + 2 * oneDayInSeconds),
      claimed: false,
      metadataURI: "Roaster's Reserve — Small-batch artisan coffee roaster. Category: Food. Direct-sourced beans, seasonal roasts, and subscription options.",
    },
  ];
}

/**
 * Creator name mapping for sample campaigns
 * Maps sample campaign creator addresses to meaningful names
 */
export const SAMPLE_CREATOR_NAMES: Record<string, string> = {
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0": "Eco Innovations",
  "0x8ba1f109551bD432803012645Hac136c9c8dF0E4": "TechVentures",
  "0x1234567890123456789012345678901234567890": "Indie Games Studio",
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd": "FitTech Solutions",
  "0xfedcba0987654321098765432109876543210987": "Green Energy Co",
  "0x9876543210987654321098765432109876543210": "Artisan Coffee Co",
};

