import type { RequestLane } from "@/lib/supabase/types";

export const referenceMedia = {
  homeArtwork: [
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDbLq1Zs71BOD_UILLYPQnWbOOH2geBc7rJtru8kPviBxpUARw8IKbuyEQ-WfTnf39nK2c-5JPb1MSAEUqJrWustCwKXKj9uMdMhe2uM9LKHMVLS0jFsXxts3xmJJxg8ecasWZ3ssCjPWj-W2PfSlp2yWCS2P8gnQyb2MJM11lZ8fv-X9KH7ZDFf74kMtUjTkv6_C65Ub-sK_WMqYIgXJFoq5sL8hpGKV_7dPwsZtYRIcT74xCj8kvTsobNf69E4zIR7jZhL2mqTw",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCkzDrkgbBJ2c6HDQNTpJuvg8_BaiXPYxHfye8_c2z3gsevKVPD9aQBY6YS9XtG2e_ZCLnUlIkG8Edb03G2iklpEh1DE2Sn9FN5swJguh1AkKpbY_pN3abFdnE0bu8oRfjIc24xTVZRBPmkbh9bD_mN89aj3BdfrgpA38m-ZBp-ZWTqlQblD-SEEvOX1DYlNzcER4kJiNoVDxVpwXB7I7poDwQlzToVAW7VBax-OII7_hdCqhbWzUYLUyyjlM_JrDmE-8qOnTBRAw",
  ],
  feedPeople: [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC9-Rq9OYwFX2iSpB4B27AuTO8RZ2lMtvOwE7A6idwybg9H-9EtzK7cknSHHq7w7PGmp86vnLQFH-uX8hFGeAzrtHAYUbUxgq_YaBpYWLWAn1Ler4xkwVhmde18YygXJas-5UepDyw2Te9n9F8AscjNGVbkiGtfj-l74kjMxOmeqaKfCjrcIP1Io6vn4yngzyejWjqq-GGjzDMSvVDX4a7bM3v6rM38Xa3Gzj1yMl3ikprzsPaczGVPrWlLO5s8sfxSxY_gcK4wCw",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA6eiG9Ish4xFG4JI537VZoouwNL-h-VeWJDfblNxAG4EDs_AsaPjmKQ7ShPPqcbG3T2DSpmXXemdYdSeNc_ACeKT6GP54qKD5MT83Mfug8lGQ9HIaWv8SCrJemcuAYqqtNBgU1oMzXmJZ8xMzoyD4UnQ8RHGksqA1x6Pm51MgT0ry5qa8zlAD_BrlCY1fpNIn2RHalUdO-QE0cJSJbbA5H4P8CBfbirooMh8UaEndiyfD0Je49bqVkA6_m5KGcHnxgrFpplVt4PA",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDQAQC2RbqCGHVXJ0KUrSRJKTSaML2Pt7OBjVLiDd2uPzmHnga6QgjKZUb2jDM3zSJbk0QPsJfD8Ualuj4ltZgQcfa4teGtOnPEbqH9n3AqwgFIbQQii1PhtKwYZC8MsEDKGBLKONos8vNP0Nl7WOTPXRnnpafmCqwIwKSbo44rix7IzfFqGKWsfocTU7dkcWC9-FuYEZ74DYEckHE4Py8et-p1KjKKc5-GWMs1q7ifj0woyYqPuPKlIHmU9cHPaxTlsf6bqt5_qA",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC5klFwkhoR1vsl8PPMG9M2r0eWE-0b0jMygjoAALduRPspFMguQtH8_Ng_FDy0HAJxTAAwWktHKz0zmGiEeTErPMak3B2umUGgGshDY2US6b5pOLnqkfeWlI26obV3XlBIWIPfc1yQja6KLxI4YCbcJR8RMZ5BXmOxt7Zp8JwpitdADC3kx--bI4QjznNG2JBzSFiRKXdAgtJKKZ2DjWLaOPMXHoTxFj6RsKXhmwD6GsNJyYHoq5IEnk8rP-Lcww6DLGgjWsNZfQ",
  ],
  profilePortrait:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAScZZIId51d86Q64mmYS2_MCdnkOFU05mVkjwxiaYJRjZDKc8XByf_lXFpnqnnCWi2Eb-yQfUG0-7WI5_Xy4IWxGbNufaOYz6y4qjKFntsx-rzNcbnqE_INH4Xx7EPIH7IyA31VR-OfsLudVS4JLOPChKTNzwnzagOJKgCG5hSM60AaCUzpNO17AdOuDxGGO6JxH24K7uv_CLEB2tGgYlBKat8553NHtbNaIH9EHRKZarq2skiOkWNOb3_t3lNgsl0FW6yW3QFfA",
  profileMutuals: [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDay6OFJdYKtc5KEORPog74Jb4OjuDrZtI7wM4ua0A3NYJ4ozViNQW_Hjj-TvuoEX-4VycrXr0GpCIxwUtXn4Y33UE5quMnrteC3DYP4q_m7ul97vpSqA2wtvRNOAFTkflUdOZX6PAn5ScoNvirLT--kqRThs3Bebj7gN0zqGIclvybo5anrcKuwlbHI8S0IyL2QXH9bdJG8PFo_vihwkazJgWOtyx98DIBGlxPrQDClk403J4VX4kFYj_lxX9tE34n7PQxUxGMCg",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAKoM5Ka3k5fCvm5Ce7axpphZMvP8NC5k7HmpWHO7XtwqHTYSpVgHK1L3FsR6QAmJNmicSaPWiYlyIIKmqdgnzYVpK0MOhG6PGJe87RI_SeIiAaAdPJKFKULMtqDcX2ISFq8enSpcW6JEuJhP-BG0ASPJSTkxkQyQM-rs3vlWxa8i_1n55VisKuY_BqP0RHTe-DBnLG0sqnMpm59USaFbopjXcJrOs5-FE4Ye-WFbHtZysPueSoUpnkRndVFjt_VNFPF0rwuCtaLA",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCtLWGowpA6MyugaO79-soSWJXYMZ7cRftTZvz4Ou7NfBlYGMF1MzRxBBoBrD7uA9B6usi8h_DwtAGDMp-cWhWhxJtUHSd2mKzzOZRGRcvrXJe3gcQNLfxazzDK7H6P99NUtId-JAJe5AorNvGeK8czeGqEvauQQRu0cAPJ1L370vMuGCYjYR8iyy4HTxyZUbE01wP9dksXDI4H_bQVY-ELA8qZIHFH5ZS-FeyntyESrAZ3k6RWkFXU2ZjH151LoKLHyk0PJfQspg",
  ],
  profileBanner:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBSe8WtYQGq-2WaEEWOyKBwD7BtycQbz0OOJ4EKifbK7HWawpgP5FyfXUp4fKIPiHgEroyS5yQMYUGwB82Wwc-VrNZMkpzwoDgLjVGdeZraZ5Kr0nlQJIPkFLfNyY5Jk7OGmZmVqpZyv331hzsrvGhfEhB1RSMIy4i37_A-RDsrdqfuTL1tH4vurZD0VohKW57HvyjY4KbQogE3h7WdfGYWNUyD_XFXGORYl2ATljDLquQS9V2ag50O9tApX7yfCh8ukzEyAoNCCQ",
  workspaceGallery:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDbLq1Zs71BOD_UILLYPQnWbOOH2geBc7rJtru8kPviBxpUARw8IKbuyEQ-WfTnf39nK2c-5JPb1MSAEUqJrWustCwKXKj9uMdMhe2uM9LKHMVLS0jFsXxts3xmJJxg8ecasWZ3ssCjPWj-W2PfSlp2yWCS2P8gnQyb2MJM11lZ8fv-X9KH7ZDFf74kMtUjTkv6_C65Ub-sK_WMqYIgXJFoq5sL8hpGKV_7dPwsZtYRIcT74xCj8kvTsobNf69E4zIR7jZhL2mqTw",
  workspaceMap:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAgQPPwA74xcriq2WnNJ2ZLf3RHfQtboeHwsQ3OML5Phf_Xk-l_KxAYmCDcuP_HMRNv_QWxzKpG363FxmepNJ-fxU-VCTdmqf7rX1nIt0Y5V-sOXtxA6Uqb_-1dXa9L_Bkwc8SfQkgow5qAsXI7vi3342QjVOuthFIWzmwW8LUrSNU5XjqNxQ0Yvs4EZI4J6eJC5ATtaEEcdXTaVzEW-jIlsOz-6Ms-g0KYb-WDb2HHeBv0Rn5mBjpelCtW8o3MGiJmKqSVMYLuug",
};

export const referenceProfileTags = ["Gallery Tours", "Silent Reading", "Urban Nature Walks", "Transit Navigation"];

export const referenceProfileReviews = [
  {
    title: "SF MOMA visit",
    date: "Oct 2023",
    quote: "Presence made my first solo museum trip in years feel possible and easy to enjoy.",
  },
  {
    title: "Quiet study",
    date: "Sep 2023",
    quote: "Extremely punctual, steady, and calm. It felt easy to settle into the session.",
  },
];

export const referenceSessionChecklist = [
  "Confirm the exact landmark in chat",
  "Share an ETA before you leave",
  "Send an arrival check-in once you meet",
  "Share playlist for the drive",
];

export function getFeedArtwork(index: number) {
  return referenceMedia.homeArtwork[index % referenceMedia.homeArtwork.length];
}

export function getFeedPerson(index: number) {
  return referenceMedia.feedPeople[index % referenceMedia.feedPeople.length];
}

export function getFeedVariant(index: number) {
  const pattern = ["feature", "stack", "compact", "wide"] as const;
  return pattern[index % pattern.length];
}

export function getLaneLabel(lane: RequestLane) {
  return lane === "social" ? "Social Plus-One" : "Errand Companion";
}

export function getLaneAccent(lane: RequestLane) {
  return lane === "social" ? "secondary" : "primary";
}

export function getDisplayTags(aboutMe: string, homeArea: string) {
  const fromAbout = aboutMe
    .split(/[,.]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((entry) => entry.replace(/\s+/g, " "));

  if (fromAbout.length > 0) {
    return fromAbout;
  }

  if (homeArea) {
    return [homeArea, ...referenceProfileTags.slice(0, 2)];
  }

  return referenceProfileTags.slice(0, 3);
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
