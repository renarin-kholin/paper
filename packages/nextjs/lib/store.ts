export type AdState = "disabled" | "available" | "active" | "expired";

export interface Ad {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  expiresAt?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  adState: AdState;
  adPrice?: number;
  activeAd?: Ad;
  isPaywalled?: boolean;
  accessPrice?: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  walletAddress?: string;
  balance: number;
  earnings: number;
  unlockedPosts: string[];
}

// Mock Data
export const MOCK_USERS: Record<string, User> = {
  "user-1": {
    id: "user-1",
    name: "Alice Smith",
    username: "@alicesmith",
    avatarUrl: "https://picsum.photos/seed/alice/100/100",
    walletAddress: "0x1234...5678",
    balance: 150.5,
    earnings: 340.2,
    unlockedPosts: [],
  },
  "user-2": {
    id: "user-2",
    name: "Bob Jones",
    username: "@bobjones",
    avatarUrl: "https://picsum.photos/seed/bob/100/100",
    balance: 50,
    earnings: 0,
    unlockedPosts: [],
  },
};

export const MOCK_POSTS: Post[] = [
  {
    id: "post-1",
    title: "The Future of Web Monetization",
    content:
      "Web monetization is evolving rapidly. With new protocols and standards, creators can now earn directly from their content without relying on traditional ad networks. This shift empowers creators and provides a better experience for users.\n\n## The Problem with Traditional Ads\n\nTraditional ads are intrusive, slow down page load times, and often compromise user privacy. They also create a misalignment of incentives between creators and their audience.\n\n## A New Approach\n\nBy integrating direct monetization into the fabric of the web, we can create a more sustainable ecosystem for everyone. Creators get paid for their work, and users get a cleaner, faster web experience.",
    authorId: "user-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    adState: "active",
    adPrice: 50,
    activeAd: {
      id: "ad-1",
      title: "Learn Web3 Development",
      description: "Master smart contracts and dApps with our comprehensive course.",
      url: "https://example.com/web3",
      imageUrl: "https://picsum.photos/seed/web3/600/300",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  },
  {
    id: "post-2",
    title: "Why I Switched to Minimalist Design",
    content:
      "Minimalism isn't just an aesthetic; it's a philosophy. By stripping away the non-essential, we can focus on what truly matters. In design, this means prioritizing clarity, usability, and content over flashy visuals.\n\n### The Benefits\n\n1.  **Faster Load Times:** Fewer elements mean less code and smaller assets.\n2.  **Better Accessibility:** A clean layout is easier to navigate for everyone.\n3.  **Increased Focus:** Users can concentrate on the message without distractions.",
    authorId: "user-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    adState: "available",
    adPrice: 25,
    isPaywalled: true,
    accessPrice: 2.5,
  },
  {
    id: "post-3",
    title: "A Guide to Modern CSS",
    content:
      "CSS has come a long way. With features like Grid, Flexbox, and custom properties, we can build complex layouts with ease. Let's explore some of the most powerful tools available to frontend developers today.",
    authorId: "user-2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    adState: "disabled",
  },
];

// Simple in-memory store for the session
let currentUserId = "user-1";

export const getCurrentUser = () => MOCK_USERS[currentUserId];
export const setCurrentUser = (id: string) => {
  currentUserId = id;
};

let posts = [...MOCK_POSTS];

export const getPosts = () => {
  const now = new Date().getTime();
  return [...posts]
    .map(p => {
      if (p.adState === "active" && p.activeAd?.expiresAt && new Date(p.activeAd.expiresAt).getTime() < now) {
        return { ...p, adState: "available", activeAd: undefined } as Post;
      }
      return p;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
export const getPost = (id: string) => {
  const p = posts.find(p => p.id === id);
  if (!p) return undefined;
  const now = new Date().getTime();
  if (p.adState === "active" && p.activeAd?.expiresAt && new Date(p.activeAd.expiresAt).getTime() < now) {
    return { ...p, adState: "available", activeAd: undefined } as Post;
  }
  return p;
};
export const addPost = (post: Post) => {
  posts = [post, ...posts];
};
export const updatePost = (id: string, updates: Partial<Post>) => {
  posts = posts.map(p => (p.id === id ? { ...p, ...updates } : p));
};
export const getUser = (id: string) => MOCK_USERS[id];

export const unlockPost = (userId: string, postId: string, price: number) => {
  const user = MOCK_USERS[userId];
  const post = getPost(postId);
  if (!user || !post) return false;

  const author = MOCK_USERS[post.authorId];

  if (user.balance >= price) {
    user.balance -= price;
    user.unlockedPosts.push(postId);
    if (author) {
      author.earnings += price;
      author.balance += price;
    }
    return true;
  }
  return false;
};
