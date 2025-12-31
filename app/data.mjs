export const defaultPack = {
  id: "pack_default",
  ownerId: "system",
  title: "Millionaire Questions",
  description: "A cinematic mix of pop culture, history, and science.",
  config: {
    currencySymbol: "$",
    amounts: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000],
    guaranteedLevels: [5, 10, 15],
    lifelines: [
      { key: "fifty_fifty", displayName: "50:50", enabled: true },
      { key: "ask_audience", displayName: "Ask the Audience", enabled: true },
      { key: "phone_friend", displayName: "Phone a Friend", enabled: true }
    ],
    messages: {
      winTitle: "Congratulations!",
      winMessage: "You are a millionaire!",
      loseTitle: "Game Over",
      loseMessage: "Better luck next time!",
      walkAwayTitle: "Well Played!",
      walkAwayMessage: "You walked away with:"
    }
  },
  questions: [
    {
      id: "q1",
      level: 1,
      type: "MCQ",
      promptText: "Which planet is known as the Red Planet?",
      options: { A: "Mars", B: "Venus", C: "Jupiter", D: "Mercury" },
      correctOption: "A",
      explanation: "Mars appears red due to iron oxide on its surface."
    },
    {
      id: "q2",
      level: 2,
      type: "MCQ",
      promptText: "What is the capital of Canada?",
      options: { A: "Toronto", B: "Vancouver", C: "Ottawa", D: "Montreal" },
      correctOption: "C"
    },
    {
      id: "q3",
      level: 3,
      type: "MCQ",
      promptText: "Which instrument has 88 keys?",
      options: { A: "Harp", B: "Piano", C: "Accordion", D: "Organ" },
      correctOption: "B"
    },
    {
      id: "q4",
      level: 4,
      type: "MCQ",
      promptText: "The Great Barrier Reef is located off the coast of which country?",
      options: { A: "Mexico", B: "Australia", C: "South Africa", D: "Brazil" },
      correctOption: "B"
    },
    {
      id: "q5",
      level: 5,
      type: "MCQ",
      promptText: "Which element has the chemical symbol O?",
      options: { A: "Gold", B: "Oxygen", C: "Osmium", D: "Tin" },
      correctOption: "B"
    },
    {
      id: "q6",
      level: 6,
      type: "MCQ",
      promptText: "Who wrote 'Pride and Prejudice'?",
      options: { A: "Charlotte Bronte", B: "Jane Austen", C: "Mary Shelley", D: "Emily Dickinson" },
      correctOption: "B"
    },
    {
      id: "q7",
      level: 7,
      type: "MCQ",
      promptText: "Which ocean is the largest on Earth?",
      options: { A: "Atlantic", B: "Indian", C: "Pacific", D: "Arctic" },
      correctOption: "C"
    },
    {
      id: "q8",
      level: 8,
      type: "MCQ",
      promptText: "What is the name of the first artificial satellite launched into space?",
      options: { A: "Voyager", B: "Sputnik", C: "Apollo", D: "Pioneer" },
      correctOption: "B"
    },
    {
      id: "q9",
      level: 9,
      type: "MCQ",
      promptText: "Which city hosted the 2012 Summer Olympics?",
      options: { A: "London", B: "Beijing", C: "Rio de Janeiro", D: "Tokyo" },
      correctOption: "A"
    },
    {
      id: "q10",
      level: 10,
      type: "MCQ",
      promptText: "What is the hardest natural substance?",
      options: { A: "Diamond", B: "Quartz", C: "Granite", D: "Platinum" },
      correctOption: "A"
    },
    {
      id: "q11",
      level: 11,
      type: "MCQ",
      promptText: "Which artist painted the ceiling of the Sistine Chapel?",
      options: { A: "Raphael", B: "Michelangelo", C: "Da Vinci", D: "Caravaggio" },
      correctOption: "B"
    },
    {
      id: "q12",
      level: 12,
      type: "MCQ",
      promptText: "What is the longest river in the world?",
      options: { A: "Amazon", B: "Nile", C: "Yangtze", D: "Mississippi" },
      correctOption: "B"
    },
    {
      id: "q13",
      level: 13,
      type: "MCQ",
      promptText: "Which gas makes up the majority of Earth's atmosphere?",
      options: { A: "Oxygen", B: "Nitrogen", C: "Carbon Dioxide", D: "Argon" },
      correctOption: "B"
    },
    {
      id: "q14",
      level: 14,
      type: "MCQ",
      promptText: "What is the largest desert in the world?",
      options: { A: "Sahara", B: "Gobi", C: "Antarctic Desert", D: "Arabian" },
      correctOption: "C"
    },
    {
      id: "q15",
      level: 15,
      type: "MCQ",
      promptText: "Which physicist developed the theory of general relativity?",
      options: { A: "Isaac Newton", B: "Albert Einstein", C: "Niels Bohr", D: "Marie Curie" },
      correctOption: "B"
    },
    {
      id: "fff1",
      level: 0,
      type: "FFF",
      promptText: "Fastest Finger: Which Surah is known as The Opening?",
      options: { A: "Al-Fatihah", B: "Al-Baqarah", C: "Al-Ikhlas", D: "Al-Kahf" },
      correctOption: "A"
    }
  ]
};

export const subscriptionTiers = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    priceLabel: "Free Forever",
    description: "Perfect for casual play",
    features: [
      "No custom packs",
      "10 participants per session",
      "All core game modes",
      "Basic lifelines",
      "Community support"
    ],
    limits: {
      maxPacks: 0,
      maxParticipants: 10,
      customBranding: false,
      analytics: false,
      prioritySupport: false
    }
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 9.99,
    priceLabel: "$9.99/month",
    description: "For serious hosts",
    features: [
      "10 custom packs",
      "100 participants per session",
      "Custom branding",
      "Advanced analytics",
      "Priority email support",
      "Export game data"
    ],
    limits: {
      maxPacks: 10,
      maxParticipants: 100,
      customBranding: true,
      analytics: true,
      prioritySupport: false
    },
    badge: "Most Popular"
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 49.99,
    priceLabel: "$49.99/month",
    description: "For organizations",
    features: [
      "Unlimited custom packs",
      "Unlimited participants",
      "White-label branding",
      "Advanced analytics & reporting",
      "24/7 priority support",
      "API access",
      "Dedicated account manager"
    ],
    limits: {
      maxPacks: Infinity,
      maxParticipants: Infinity,
      customBranding: true,
      analytics: true,
      prioritySupport: true
    }
  }
};
