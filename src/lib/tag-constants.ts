// Tag-based "Shareable Moments" system constants

export interface TagCategory {
  id: string;
  label: string;
  tags: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: "the_show",
    label: "The Show",
    tags: ["Didn't see that coming", "Mid tbh", "Played the classics", "Took me somewhere"],
  },
  {
    id: "the_moment",
    label: "The Moment",
    tags: ["Got emotional", "Chills", "Was locked in", "Core memory", "Never hit for me"],
  },
  {
    id: "the_space",
    label: "The Space",
    tags: ["Space to dance", "Sound was dialed", "Lights went crazy", "Ubers were f**kd"],
  },
  {
    id: "the_people",
    label: "The People",
    tags: ["All time squad", "Crowd went off", "Felt connected", "Not the vibe"],
  },
];

export const ALL_TAGS = TAG_CATEGORIES.flatMap(c => c.tags);

export const getCategoryForTag = (tag: string): string | undefined => {
  return TAG_CATEGORIES.find(c => c.tags.includes(tag))?.id;
};

export const getCategoryLabel = (categoryId: string): string => {
  return TAG_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
};
