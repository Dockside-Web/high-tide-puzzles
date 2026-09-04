import type { ImageMetadata } from "astro";
import buoyIcon from "../assets/puzzle-icons/buoy.png";
import puzzleNameIcon from "../assets/puzzle-icons/PUZZLENAME-icon.png";

// Direct component imports from their respective feature folders
import Buoy from "./Buoy/Buoy.astro";
import AnotherPuzzle from "./AnotherPuzzle/AnotherPuzzle.astro";

export interface Difficulty {
  id: string;
  label: string;
}

export interface PuzzleToolbarConfig {
  showUndo?: boolean;
  showRedo?: boolean;
  showHint?: boolean;
  showReset?: boolean;
  showErase?: boolean;
}

export interface PuzzleConfig {
  slug: string;
  name: string;
  component: any; // Astro component type reference
  icon: ImageMetadata;
  instructions: string;
  difficulties: Difficulty[];
  toolbar: PuzzleToolbarConfig;
  isNew?: boolean;
}

export const PUZZLES: Record<string, PuzzleConfig> = {
  "buoy-puzzle": {
    slug: "buoy-puzzle",
    name: "Buoy Puzzle",
    component: Buoy,
    icon: buoyIcon,
    instructions: "This is a buoy puzzle for demonstration purposes.",
    difficulties: [
      { id: "easy", label: "Easy" },
      { id: "hard", label: "Hard" }
    ],
    toolbar: {
      showUndo: true,
      showReset: true,
      showHint: true
    }
  },
  "another-puzzle": {
    slug: "another-puzzle",
    name: "Another Puzzle",
    component: AnotherPuzzle,
    icon: puzzleNameIcon,
    instructions: "This is another test puzzle.",
    difficulties: [{ id: "standard", label: "Standard" }],
    toolbar: {
      showUndo: true,
      showHint: true,
      showReset: true,
      showErase: true
    },
    isNew: true
  }
};

export const PUZZLE_LIST = Object.values(PUZZLES);
