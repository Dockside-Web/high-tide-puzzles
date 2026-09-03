import type { ImageMetadata } from "astro";
import puzzleNameIcon from "../assets/puzzle-icons/PUZZLENAME-icon.png";

export interface Difficulty {
  id: string;
  label: string;
}

export interface PuzzleConfig {
  slug: string;
  name: string;
  component: string; // File name without .astro (e.g. "TestPuzzle")
  icon: ImageMetadata;
  instructions: string;
  difficulties: Difficulty[];
  isNew?: boolean;
}

export const PUZZLES: Record<string, PuzzleConfig> = {
  "test-puzzle": {
    slug: "test-puzzle",
    name: "Test Puzzle",
    component: "TestPuzzle",
    icon: puzzleNameIcon,
    instructions: "This is a test puzzle for demonstration purposes.",
    difficulties: [
      { id: "easy", label: "Easy" },
      { id: "hard", label: "Hard" }
    ]
  },
  "another-puzzle": {
    slug: "another-puzzle",
    name: "Another Puzzle",
    component: "AnotherPuzzle",
    icon: puzzleNameIcon,
    instructions: "This is another test puzzle.",
    difficulties: [{ id: "standard", label: "Standard" }],
    isNew: true
  }
};

export const PUZZLE_LIST = Object.values(PUZZLES);
